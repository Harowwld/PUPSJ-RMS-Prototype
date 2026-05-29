import { NextResponse } from "next/server";
// Cache invalidation comment to trigger rebuild
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import crypto from "node:crypto";
import AdmZip from "adm-zip";
import {
  createBackupRecord,
  decryptBackupBuffer,
  encryptBackupBuffer,
  getBackupsDir,
  getLocalDir,
  listBackups,
} from "../../../../../lib/backupsRepo";
import { dbRun, reloadDb, flushDb, getDb, setMaintenanceMode } from "../../../../../lib/sqlite";
import { writeAuditLog } from "../../../../../lib/auditLogRequest";
import { requireAdmin, createAuthErrorResponse } from "../../../../../lib/authHelpers";
import { requireTOTP, extractTOTPToken } from "../../../../../lib/totpMiddleware";
import { clearHealthCache } from "../../health/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Admin access required", 403);
  }

  const totpToken = extractTOTPToken(req.headers);
  const totpResult = await requireTOTP(user.id, totpToken);
  if (!totpResult.valid) {
    return NextResponse.json(
      { ok: false, error: "TOTP verification required: " + totpResult.error, requiresTOTP: true },
      { status: 403 }
    );
  }

  let stagingDir = null;

  try {
    console.log("[RESTORE] Starting restore process...");
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    // Convert uploaded file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const uploadedBuffer = Buffer.from(arrayBuffer);
    const zipInputBuffer = decryptBackupBuffer(uploadedBuffer);

    const timestamp = Date.now();
    const isoTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const localDir = getLocalDir();
    stagingDir = path.join(localDir, `restore-staging-${timestamp}`);

    // Create staging directory
    fs.mkdirSync(stagingDir, { recursive: true });

    // Load uploaded zip (plain zip or decrypted zip payload)
    const zip = new AdmZip(zipInputBuffer);

    // Extract everything to staging dir
    zip.extractAllTo(stagingDir, true);

    const stagedDbPath = path.join(stagingDir, "db.sqlite");
    const stagedUploadsDir = path.join(stagingDir, "uploads");

    // Basic validation of uploaded backup
    if (!fs.existsSync(stagedDbPath)) {
      throw new Error("Invalid backup format: db.sqlite not found in the root of the archive.");
    }

    const currentDbPath = path.join(localDir, "db.sqlite");
    const currentUploadsDir = path.join(localDir, "uploads");

    // --- PHASE 1: CREATE SNAPSHOT FILE ---
    console.log("[RESTORE] Creating pre-restore snapshot file...");
    const snapshotTimestamp = new Date();
    const dateStr = snapshotTimestamp.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = snapshotTimestamp.toTimeString().split(" ")[0].replace(/:/g, "").slice(0, 4); // HHMM
    const snapshotFilename = `PUP-RECORDS-SAFETY-SNAPSHOT-${dateStr}-${timeStr}.zip.enc`;
    
    const backupsDir = getBackupsDir();
    const snapshotPath = path.join(backupsDir, snapshotFilename);

    const snapshotZip = new AdmZip();
    if (fs.existsSync(currentDbPath)) {
      console.log(`[RESTORE] Adding current DB to snapshot: ${currentDbPath}`);
      snapshotZip.addLocalFile(currentDbPath, "", "db.sqlite");
    }
    if (fs.existsSync(currentUploadsDir)) {
      console.log(`[RESTORE] Adding current uploads to snapshot: ${currentUploadsDir}`);
      snapshotZip.addLocalFolder(currentUploadsDir, "uploads");
    }

    const zipBuffer = snapshotZip.toBuffer();
    const encryptedSnapshot = encryptBackupBuffer(zipBuffer);
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
    fs.writeFileSync(snapshotPath, encryptedSnapshot);
    console.log(`[RESTORE] Snapshot file written to disk: ${snapshotPath} (${encryptedSnapshot.length} bytes)`);

    const hashSum = crypto.createHash("sha256");
    hashSum.update(encryptedSnapshot);
    const checksum = hashSum.digest("hex");
    const sizeBytes = encryptedSnapshot.length;

    // Force the application to checkpoint and truncate the WAL file before we overwrite it.
    // This avoids deleting the WAL file on disk (which causes concurrent connections to throw disk I/O errors).
    try {
      const dbInstance = await getDb();
      dbInstance.pragma("wal_checkpoint(TRUNCATE)");
      console.log("[RESTORE] WAL file checkpointed and truncated successfully.");
    } catch (checkpointErr) {
      console.error("[RESTORE] WAL checkpoint failed:", checkpointErr.message);
    }

    // Enable database lock / maintenance mode so concurrent background requests cannot run writes during restoration
    setMaintenanceMode(true);

    // Give OS a moment to release file handles
    await new Promise(r => setTimeout(r, 500));

    // Replace DB using SQLite's Online Backup API
    // This allows page-by-page overwrite that seamlessly handles active WAL logs 
    // and handles locks automatically, preventing SQLITE_IOERR_SHORT_READ or file lock errors.
    let stagedDbInstance = null;
    try {
      stagedDbInstance = new Database(stagedDbPath);
      await stagedDbInstance.backup(currentDbPath);
      console.log("[RESTORE] Live database cleanly overwritten via SQLite Online Backup API.");
    } catch (backupErr) {
      console.error("[RESTORE] Online Backup API failed, falling back to manual copy...", backupErr.message);
      
      // Fallback: Delete WAL/SHM and copy
      const walPath = `${currentDbPath}-wal`;
      const shmPath = `${currentDbPath}-shm`;
      try {
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      } catch (e) {}
      fs.copyFileSync(stagedDbPath, currentDbPath);
    } finally {
      if (stagedDbInstance) {
        try { stagedDbInstance.close(); } catch (e) {}
      }
    }

    // Replace Uploads folder
    if (fs.existsSync(stagedUploadsDir)) {
      console.log("[RESTORE] Replacing uploads folder...");
      if (fs.existsSync(currentUploadsDir)) {
         fs.rmSync(currentUploadsDir, { recursive: true, force: true });
      }
      fs.cpSync(stagedUploadsDir, currentUploadsDir, { recursive: true });
    }

    // Release maintenance mode lock to allow queries against the restored database
    setMaintenanceMode(false);

    // --- PHASE 3: RECORD SNAPSHOT IN THE NEW DATABASE ---
    console.log("[RESTORE] Recording snapshot in the restored database...");
    try {
      const record = await createBackupRecord({
        filename: snapshotFilename,
        sizeBytes,
        checksum,
      });
      console.log(`[RESTORE] Snapshot record created in DB: ID=${record?.id}`);

      // Final verification of the entire backups table
      const allBackups = await listBackups();
      console.log(`[RESTORE] Total backups now in DB: ${allBackups.length}`);
      
      // NOTE: We no longer delete orphaned backup files on disk here.
      // Doing so is destructive if the user restores an older backup, 
      // as it would delete all newer backups not known to that older DB state.
      console.log("[RESTORE] Orphaned backup cleanup skipped to prevent data loss.");
    } catch (dbErr) {
      console.error("[RESTORE] Failed to record snapshot in DB:", dbErr);
      // We don't throw here because the restore itself was successful
    }

    // Cleanup staging
    fs.rmSync(stagingDir, { recursive: true, force: true });
    console.log("[RESTORE] Process complete.");

    await writeAuditLog(req, `Restore System Backup`, { 
      details: `restored full system state from uploaded backup file '${file.name}'. A pre-restore safety snapshot was automatically created`,
      severity: "WARNING",
      entity_type: "Backup"
    });

    // Record restoration timestamp in settings
    try {
      const now = new Date().toISOString();
      await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_restoration_at', ?)", [now]);
      // Clear health cache so the new timestamp is picked up immediately
      clearHealthCache();
    } catch (settingErr) {
      console.error("[RESTORE] Failed to update last_restoration_at setting:", settingErr);
    }

    return NextResponse.json({
      ok: true,
      message: "System restored successfully from backup. A safety snapshot was created."
    });
  } catch (error) {
    console.error("[RESTORE] Critical Error:", error);
    // Make sure we release the maintenance mode lock on error!
    setMaintenanceMode(false);
    if (stagingDir && fs.existsSync(stagingDir)) {
      try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch (e) {}
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

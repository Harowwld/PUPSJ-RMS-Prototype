import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
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
import { reloadDb } from "../../../../../lib/sqlite";
import { writeAuditLog } from "../../../../../lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req) {
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
    const snapshotFilename = `pre-restore-snapshot-${isoTimestamp}.zip.enc`;
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

    // --- PHASE 2: OVERWRITE SYSTEM ---
    console.log("[RESTORE] Overwriting system with uploaded backup...");

    // Replace DB
    fs.copyFileSync(stagedDbPath, currentDbPath);
    console.log("[RESTORE] db.sqlite overwritten.");

    // Force the application to reload the connection to the NEW database
    reloadDb();

    // Replace Uploads folder
    if (fs.existsSync(stagedUploadsDir)) {
      console.log("[RESTORE] Replacing uploads folder...");
      if (fs.existsSync(currentUploadsDir)) {
         fs.rmSync(currentUploadsDir, { recursive: true, force: true });
      }
      fs.cpSync(stagedUploadsDir, currentUploadsDir, { recursive: true });
    }

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
      allBackups.forEach(b => {
        if (b.filename === snapshotFilename) {
          console.log(`[RESTORE] VERIFIED: Snapshot ${snapshotFilename} exists in DB.`);
        }
      });

      // Cleanup orphaned files in the backups folder that are not in the restored DB
      const validFilenames = new Set(allBackups.map(b => b.filename));
      const filesOnDisk = fs.readdirSync(backupsDir);
      
      filesOnDisk.forEach(file => {
        if (!validFilenames.has(file)) {
          const filePath = path.join(backupsDir, file);
          console.log(`[RESTORE] Deleting orphaned backup file: ${file}`);
          try {
            fs.unlinkSync(filePath);
          } catch (delErr) {
            console.error(`[RESTORE] Failed to delete orphaned file ${file}:`, delErr);
          }
        }
      });
    } catch (dbErr) {
      console.error("[RESTORE] Failed to record snapshot in DB:", dbErr);
      // We don't throw here because the restore itself was successful
    }

    // Cleanup staging
    fs.rmSync(stagingDir, { recursive: true, force: true });
    console.log("[RESTORE] Process complete.");

    await writeAuditLog(req, `Restored system backup from uploaded file: ${file.name}`);
    return NextResponse.json({
      ok: true,
      message: "System restored successfully from backup. A safety snapshot was created."
    });

  } catch (error) {
    console.error("[RESTORE] Critical Error:", error);
    if (stagingDir && fs.existsSync(stagingDir)) {
      try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch (e) {}
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

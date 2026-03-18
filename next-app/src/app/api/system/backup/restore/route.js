import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import AdmZip from "adm-zip";
import { getBackupsDir, getLocalDir, createBackupRecord } from "../../../../../lib/backupsRepo";
import { reloadDb } from "../../../../../lib/sqlite";

export const runtime = "nodejs";

export async function POST(req) {
  let stagingDir = null;
  
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ ok: false, error: "Only .zip files are supported" }, { status: 400 });
    }

    // Convert uploaded file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const isoTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const localDir = getLocalDir();
    stagingDir = path.join(localDir, `restore-staging-${timestamp}`);
    
    // Create staging directory
    fs.mkdirSync(stagingDir, { recursive: true });

    // Load uploaded zip
    const zip = new AdmZip(buffer);
    
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

    // --- SAFETY MEASURE: PRE-RESTORE SNAPSHOT ---
    console.log("[RESTORE] Creating pre-restore snapshot...");
    const snapshotFilename = `pre-restore-snapshot-${isoTimestamp}.zip`;
    const backupsDir = getBackupsDir();
    const snapshotPath = path.join(backupsDir, snapshotFilename);
    
    const snapshotZip = new AdmZip();
    if (fs.existsSync(currentDbPath)) {
      snapshotZip.addLocalFile(currentDbPath, "", "db.sqlite");
    }
    if (fs.existsSync(currentUploadsDir)) {
      snapshotZip.addLocalFolder(currentUploadsDir, "uploads");
    }
    
    snapshotZip.writeZip(snapshotPath);
    
    // Record snapshot in DB (using the current DB before it gets overwritten)
    if (fs.existsSync(snapshotPath) && fs.statSync(snapshotPath).size > 0) {
      const snapshotBuffer = fs.readFileSync(snapshotPath);
      const hashSum = crypto.createHash("sha256");
      hashSum.update(snapshotBuffer);
      const checksum = hashSum.digest("hex");
      
      await createBackupRecord({
        filename: snapshotFilename,
        sizeBytes: snapshotBuffer.length,
        checksum,
      });
      console.log(`[RESTORE] Pre-restore snapshot created: ${snapshotFilename}`);
    } else {
      console.warn("[RESTORE] Warning: Failed to create pre-restore snapshot, proceeding anyway.");
    }
    // --- END SAFETY MEASURE ---

    // Proceed with Restoration
    console.log("[RESTORE] Overwriting current database and files...");
    
    // Replace DB
    fs.copyFileSync(stagedDbPath, currentDbPath);
    
    // Force the application to reload the DB from disk on the next query
    reloadDb();

    // Replace Uploads if it exists in the backup
    if (fs.existsSync(stagedUploadsDir)) {
      if (fs.existsSync(currentUploadsDir)) {
         fs.rmSync(currentUploadsDir, { recursive: true, force: true });
      }
      fs.cpSync(stagedUploadsDir, currentUploadsDir, { recursive: true });
    }

    // Cleanup staging
    fs.rmSync(stagingDir, { recursive: true, force: true });

    return NextResponse.json({
      ok: true,
      message: "System restored successfully from backup."
    });

  } catch (error) {
    console.error("Restore Error:", error);
    
    // Attempt cleanup on error
    if (stagingDir && fs.existsSync(stagingDir)) {
      try {
        fs.rmSync(stagingDir, { recursive: true, force: true });
      } catch (e) {
        console.error("Failed to cleanup staging dir:", e);
      }
    }

    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import AdmZip from "adm-zip";
import { getBackupsDir, createBackupRecord, listBackups, getLocalDir } from "../../../../lib/backupsRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: List all backups from database
 */
export async function GET() {
  try {
    const data = await listBackups();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("Backup List Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: Create a new standard ZIP backup (No Encryption)
 */
export async function POST() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFilename = `backup-${timestamp}.zip`;
    const backupsDir = getBackupsDir();
    const backupPath = path.join(backupsDir, backupFilename);
    console.log(`[BACKUP CREATE] target path: ${backupPath}`);
    
    const localDir = getLocalDir();
    const dbPath = path.join(localDir, "db.sqlite");
    const uploadsDir = path.join(localDir, "uploads");
    
    try {
      // Create the ZIP archive
      const zip = new AdmZip();

      // Add Database
      if (fs.existsSync(dbPath)) {
        zip.addLocalFile(dbPath, "", "db.sqlite");
      }
      
      // Add Uploads folder
      if (fs.existsSync(uploadsDir)) {
        zip.addLocalFolder(uploadsDir, "uploads");
      }
      
      // Save the ZIP as a standard, unencrypted archive
      zip.writeZip(backupPath);

      // Verify file was actually created and has size
      if (!fs.existsSync(backupPath) || fs.statSync(backupPath).size === 0) {
          throw new Error("Failed to write ZIP file to disk or file is empty.");
      }

      // Calculate Checksum (SHA-256) for integrity verification
      const fileBuffer = fs.readFileSync(backupPath);
      const hashSum = crypto.createHash("sha256");
      hashSum.update(fileBuffer);
      const checksum = hashSum.digest("hex");
      const sizeBytes = fileBuffer.length;
      
      // Record in DB
      const record = await createBackupRecord({
        filename: backupFilename,
        sizeBytes,
        checksum,
      });
      
      return NextResponse.json({
        ok: true,
        message: "Standard backup created successfully",
        data: record
      });
    } catch (err) {
      throw err;
    }
  } catch (error) {
    console.error("Backup Creation Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

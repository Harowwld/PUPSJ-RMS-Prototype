import { dbAll, dbGet, dbRun } from "./sqlite";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import AdmZip from "adm-zip";

export function getLocalDir() {
  return process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");
}

export function getBackupsDir() {
  const dir = path.join(getLocalDir(), "backups");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function createBackupRecord({
  filename,
  sizeBytes,
  checksum,
  encryptionKeyId,
}) {
  const res = await dbRun(
    `
    INSERT INTO backups (
      filename,
      size_bytes,
      checksum,
      encryption_key_id,
      status_local
    ) VALUES (?, ?, ?, ?, 'Success')
  `,
    [filename, sizeBytes, checksum, encryptionKeyId || null]
  );
  return await getBackupById(res.lastInsertRowid);
}

export async function listBackups() {
  const rows = await dbAll(
    `SELECT * FROM backups ORDER BY datetime(created_at) DESC`
  );
  console.log(`[REPO] listBackups returned ${rows.length} rows.`);
  if (rows.length > 0) {
    console.log(`[REPO] Latest backup: ${rows[0].filename} (Created: ${rows[0].created_at})`);
  }
  return rows;
}

export async function getBackupById(id) {
  return await dbGet(`SELECT * FROM backups WHERE id = ?`, [id]);
}

export async function updateBackupStatus(id, field, status) {
  // field should be status_local or status_external
  const allowed = ["status_local", "status_external"];
  if (!allowed.includes(field)) return;

  await dbRun(
    `UPDATE backups SET ${field} = ? WHERE id = ?`,
    [status, id]
  );
}

export async function deleteBackupRecord(id) {
  const result = await dbRun(`DELETE FROM backups WHERE id = ?`, [id]);
  return result.changes;
}

export async function executeBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilename = `backup-${timestamp}.zip`;
  const backupsDir = getBackupsDir();
  const backupPath = path.join(backupsDir, backupFilename);
  console.log(`[BACKUP] Creating: ${backupPath}`);
  
  const localDir = getLocalDir();
  const dbPath = path.join(localDir, "db.sqlite");
  const uploadsDir = path.join(localDir, "uploads");
  
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
  
  return record;
}

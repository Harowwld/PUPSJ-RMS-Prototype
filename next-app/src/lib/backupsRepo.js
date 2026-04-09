import { dbAll, dbGet, dbRun } from "./sqlite";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import AdmZip from "adm-zip";

const BACKUP_ENC_MAGIC = Buffer.from("PUPSBK1", "utf8");
const BACKUP_ENC_ALGO = "aes-256-gcm";
const BACKUP_ENC_IV_LENGTH = 12;
const BACKUP_ENC_TAG_LENGTH = 16;

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

export function getExternalBackupsDir() {
  const explicit = process.env.EXTERNAL_BACKUP_PATH;
  const dir = explicit
    ? explicit
    : path.join(getLocalDir(), "external_media");
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
  const backupFilename = `backup-${timestamp}.zip.enc`;
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

  // Build ZIP in memory first, then encrypt with AES-256-GCM.
  const zipBuffer = zip.toBuffer();
  const encryptedBuffer = encryptBackupBuffer(zipBuffer);
  fs.writeFileSync(backupPath, encryptedBuffer);

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

function getBackupEncryptionKey() {
  const rawSecret =
    process.env.BACKUP_ENCRYPTION_KEY || process.env.JWT_SECRET || "";
  const normalized = String(rawSecret).trim();
  if (!normalized) {
    throw new Error(
      "Missing backup encryption secret. Set BACKUP_ENCRYPTION_KEY or JWT_SECRET."
    );
  }
  return crypto.createHash("sha256").update(normalized).digest();
}

export function isEncryptedBackupBuffer(buffer) {
  return (
    Buffer.isBuffer(buffer) &&
    buffer.length > BACKUP_ENC_MAGIC.length + BACKUP_ENC_IV_LENGTH + BACKUP_ENC_TAG_LENGTH &&
    buffer.subarray(0, BACKUP_ENC_MAGIC.length).equals(BACKUP_ENC_MAGIC)
  );
}

export function encryptBackupBuffer(plainBuffer) {
  if (!Buffer.isBuffer(plainBuffer)) {
    throw new Error("Backup encryption input must be a Buffer.");
  }
  const key = getBackupEncryptionKey();
  const iv = crypto.randomBytes(BACKUP_ENC_IV_LENGTH);
  const cipher = crypto.createCipheriv(BACKUP_ENC_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([BACKUP_ENC_MAGIC, iv, tag, encrypted]);
}

export function decryptBackupBuffer(encryptedBuffer) {
  if (!Buffer.isBuffer(encryptedBuffer)) {
    throw new Error("Backup decryption input must be a Buffer.");
  }
  if (!isEncryptedBackupBuffer(encryptedBuffer)) {
    return encryptedBuffer;
  }
  const key = getBackupEncryptionKey();
  const offsetIv = BACKUP_ENC_MAGIC.length;
  const offsetTag = offsetIv + BACKUP_ENC_IV_LENGTH;
  const offsetCipher = offsetTag + BACKUP_ENC_TAG_LENGTH;
  const iv = encryptedBuffer.subarray(offsetIv, offsetTag);
  const tag = encryptedBuffer.subarray(offsetTag, offsetCipher);
  const ciphertext = encryptedBuffer.subarray(offsetCipher);
  const decipher = crypto.createDecipheriv(BACKUP_ENC_ALGO, key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error("Failed to decrypt backup. Invalid key or corrupted file.");
  }
}

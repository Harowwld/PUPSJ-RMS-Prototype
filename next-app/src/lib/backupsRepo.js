import { dbAll, dbGet, dbRun } from "./sqlite";
import path from "node:path";
import fs from "node:fs";

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
  return await dbAll(
    `SELECT * FROM backups ORDER BY datetime(created_at) DESC`
  );
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

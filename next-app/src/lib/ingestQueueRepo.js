import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dbAll, dbGet, dbRun } from "./sqlite";

function getLocalDir() {
  return process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");
}

export function getIngestDir() {
  const dir = path.join(getLocalDir(), "ingest");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function makeIngestStorageFilename(originalFilename = "scan.bin") {
  const ext = path.extname(String(originalFilename || "")).toLowerCase() || ".bin";
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
}

export async function createIngestItem({
  originalFilename,
  storageFilename,
  mimeType,
  sizeBytes,
  sourceStation,
  contentSha256,
  status = "pending",
}) {
  const res = await dbRun(
    `INSERT INTO ingest_queue (
      original_filename, storage_filename, mime_type, size_bytes, status, source_station, content_sha256
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      String(originalFilename || "").trim(),
      String(storageFilename || "").trim(),
      String(mimeType || "").trim(),
      Number(sizeBytes || 0),
      status,
      sourceStation ? String(sourceStation).trim() : null,
      contentSha256 ? String(contentSha256).trim() : null,
    ]
  );
  return await getIngestById(res.lastInsertRowid);
}

export async function getIngestById(id) {
  const row = await dbGet("SELECT * FROM ingest_queue WHERE id = ?", [id]);
  return row || null;
}

export async function listPendingIngest({ limit = 20, offset = 0, includeFailed = false } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  const statusFilter = includeFailed
    ? "WHERE status IN ('pending', 'failed')"
    : "WHERE status = 'pending'";

  const rows = await dbAll(
    `SELECT * FROM ingest_queue ${statusFilter}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [lim, off]
  );
  const totalRow = await dbGet(
    `SELECT COUNT(*) AS count FROM ingest_queue ${statusFilter.replace("WHERE", "WHERE")}`
  );
  return { rows, total: Number(totalRow?.count || 0), limit: lim, offset: off };
}

export async function markIngestPromoted(id, promotedDocumentId) {
  await dbRun(
    `UPDATE ingest_queue
     SET status = 'promoted', promoted_document_id = ?, last_error = NULL
     WHERE id = ?`,
    [promotedDocumentId, id]
  );
  return await getIngestById(id);
}

export async function markIngestFailed(id, errorMessage) {
  await dbRun(
    `UPDATE ingest_queue
     SET status = 'failed', last_error = ?
     WHERE id = ?`,
    [String(errorMessage || "Unknown error"), id]
  );
  return await getIngestById(id);
}

export async function abandonAllPendingIngest() {
  const rows = await dbAll(
    "SELECT id, storage_filename FROM ingest_queue WHERE status = 'pending' ORDER BY id ASC",
    []
  );
  for (const row of rows) {
    const absPath = getIngestFilePath(row.storage_filename);
    try {
      fs.unlinkSync(absPath);
    } catch {
      // ignore missing files
    }
  }
  const res = await dbRun(
    "UPDATE ingest_queue SET status = 'abandoned', last_error = NULL WHERE status = 'pending'",
    []
  );
  return { clearedCount: rows.length, updatedRows: res.changes || 0 };
}

export function getIngestFilePath(storageFilename) {
  return path.join(getIngestDir(), String(storageFilename || ""));
}

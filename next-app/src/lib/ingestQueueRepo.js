import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import { query, queryOne } from "./postgres.js";

function getLocalDir() {
  return process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
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

export async function createIngestItem({ officeId = "registrar", batchId = null, originalFilename, storageFilename, mimeType, sizeBytes, sourceStation, contentSha256, status = "pending" }) {
  const res = await dbRun(
    `INSERT INTO ingest_queue (office_id, batch_id, original_filename, storage_filename, mime_type, size_bytes, status, source_station, content_sha256, review_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Processing')`,
    [officeId || "registrar", batchId, String(originalFilename || "").trim(), String(storageFilename || "").trim(), String(mimeType || "").trim(), Number(sizeBytes || 0), status, sourceStation ? String(sourceStation).trim() : null, contentSha256 ? String(contentSha256).trim() : null],
  );
  return getIngestById(res.lastInsertRowid);
}

export const getIngestById = (id) => dbGet("SELECT * FROM ingest_queue WHERE id = ?", [id]);

export async function listPendingIngest({ limit = 100, offset = 0, includeFailed = true, includeRejected = true, onlyUnprocessed = false, batchId = null, officeId = null } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const off = Math.max(Number(offset) || 0, 0);
  const clauses = ["status <> 'promoted'"];
  const params = [];
  if (officeId) { clauses.push("office_id = ?"); params.push(officeId); }
  if (!includeFailed) clauses.push("status NOT IN ('failed', 'rejected')");
  if (!includeRejected) clauses.push("status <> 'rejected'");
  if (onlyUnprocessed) clauses.push("lower(COALESCE(ocr_status, 'pending')) IN ('pending', 'processing')");
  if (batchId) { clauses.push("batch_id = ?"); params.push(batchId); }
  const where = `WHERE ${clauses.join(" AND ")}`;
  const rows = await dbAll(`SELECT * FROM ingest_queue ${where} ORDER BY created_at ASC, id ASC LIMIT ? OFFSET ?`, [...params, lim, off]);
  const totalRow = await dbGet(`SELECT COUNT(*) AS count FROM ingest_queue ${where}`, params);
  return { rows, total: Number(totalRow?.count || 0), limit: lim, offset: off };
}

export async function createBatch({ officeId = "registrar", sourceStation = null } = {}) {
  const existing = await queryOne(
    `SELECT batch_id
     FROM ingest_queue
       WHERE office_id = $1 AND batch_id IS NOT NULL AND status = 'pending'
       AND lower(COALESCE(review_status, 'Processing')) IN ('processing', 'pending')
     ORDER BY created_at ASC, id ASC
     LIMIT 1`,
    [officeId],
  );
  if (existing?.batch_id) {
    const pending = await queryOne(
      `SELECT COUNT(*)::int AS count
       FROM ingest_queue
       WHERE office_id = $1 AND batch_id = $2 AND status = 'pending'
         AND lower(COALESCE(review_status, 'Processing')) IN ('processing', 'pending')`,
      [officeId, existing.batch_id],
    );
    return { batchId: existing.batch_id, sourceStation, claimed: Number(pending?.count || 0), ...(await getBatch(existing.batch_id, officeId)) };
  }

  const batchId = crypto.randomUUID();
  const result = await dbRun(
    `UPDATE ingest_queue SET batch_id = ?, office_id = COALESCE(office_id, ?), review_status = 'Processing'
     WHERE status = 'pending' AND lower(COALESCE(review_status, 'Processing')) IN ('processing', 'pending')
       AND (office_id = ? OR office_id IS NULL) AND batch_id IS NULL`,
    [batchId, officeId, officeId],
  );
  return { batchId, sourceStation, claimed: Number(result.changes || 0), ...(await getBatch(batchId, officeId)) };
}

export async function getBatch(batchId, officeId = null) {
  const params = [batchId];
  const officeClause = officeId ? " AND office_id = ?" : "";
  if (officeId) params.push(officeId);
  const rows = await dbAll(`SELECT * FROM ingest_queue WHERE batch_id = ?${officeClause} ORDER BY id ASC`, params);
  const counts = rows.reduce((acc, row) => {
    const rawStatus = String(row.review_status || (row.status === "failed" ? "Failed" : "Processing")).toLowerCase();
    const key = { "needs review": "Needs Review", needs_review: "Needs Review", processing: "Processing", pending: "Processing", failed: "Failed", duplicate: "Duplicate", conflict: "Conflict", confirmed: "Confirmed", rejected: "Rejected" }[rawStatus] || row.review_status;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return { batchId, total: rows.length, counts, rows };
}

export async function claimNextBatchItem(batchId, officeId = "registrar") {
  return queryOne(
    `UPDATE ingest_queue SET status = 'processing', ocr_status = 'processing', review_status = 'Processing'
     WHERE id = (SELECT id FROM ingest_queue WHERE batch_id = $1 AND office_id = $2 AND status = 'pending' AND lower(COALESCE(review_status, 'Processing')) IN ('processing', 'pending') ORDER BY id ASC FOR UPDATE SKIP LOCKED LIMIT 1)
     RETURNING *`,
    [batchId, officeId],
  );
}

export async function saveOcrResult(id, { text, name, studentNo, docType, confidence, qualityScore = null, evidence = null, method = null, matchStatus = null, candidates, regions = null, pageIndex = null, status = "Needs Review", error = null }) {
  const failed = Boolean(error && status !== "Duplicate");
  await query(
    `UPDATE ingest_queue SET ocr_status = $1, ocr_text = $2, ocr_name = $3, proposed_student_no = $4, proposed_doc_type = $5, match_confidence = $6, ocr_quality_score = $7, match_evidence = $8::jsonb, match_method = $9, match_status = $10, match_candidates = $11::jsonb, ocr_regions = $12::jsonb, ocr_page_index = $13, review_status = $14, last_error = $15, status = 'pending' WHERE id = $16`,
    [failed ? "failed" : "completed", text || "", name || null, studentNo || null, docType || null, confidence == null ? null : Number(confidence), qualityScore == null ? null : Number(qualityScore), evidence ? JSON.stringify(evidence) : null, method, matchStatus, JSON.stringify(candidates || []), regions ? JSON.stringify(regions) : null, pageIndex == null ? null : Number(pageIndex), failed ? "Failed" : status, error, id],
  );
  return getIngestById(id);
}

export async function markIngestPromoted(id, promotedDocumentId, reviewedBy = null) {
  await query(`UPDATE ingest_queue SET status = 'promoted', review_status = 'Confirmed', promoted_document_id = $1, reviewed_by = COALESCE($2, reviewed_by), reviewed_at = NOW(), last_error = NULL WHERE id = $3`, [promotedDocumentId, reviewedBy, id]);
  return getIngestById(id);
}

export async function markIngestFailed(id, errorMessage) {
  await query(`UPDATE ingest_queue SET status = 'failed', ocr_status = 'failed', review_status = 'Failed', last_error = $1 WHERE id = $2`, [String(errorMessage || "Unknown error"), id]);
  return getIngestById(id);
}

export async function updateReview(id, patch, reviewedBy) {
  const allowed = { ocrText: "ocr_text", ocrName: "ocr_name", studentNo: "proposed_student_no", docType: "proposed_doc_type", reviewStatus: "review_status", reviewNote: "review_note" };
  const entries = Object.entries(patch || {}).filter(([key, value]) => allowed[key] && value !== undefined);
  if (!entries.length) return getIngestById(id);
  const values = [];
  const sets = entries.map(([key, value], index) => { values.push(value === "" ? null : value); return `${allowed[key]} = $${index + 1}`; });
  values.push(reviewedBy || null, id);
  sets.push(`reviewed_by = $${values.length - 1}`, "reviewed_at = NOW()");
  await query(`UPDATE ingest_queue SET ${sets.join(", ")} WHERE id = $${values.length}`, values);
  return getIngestById(id);
}

export async function resetForRetry(id) {
  await query(`UPDATE ingest_queue SET status = 'pending', ocr_status = 'pending', review_status = 'Processing', ocr_text = NULL, ocr_name = NULL, proposed_student_no = NULL, proposed_doc_type = NULL, match_confidence = NULL, ocr_quality_score = NULL, match_evidence = NULL, match_method = NULL, match_status = NULL, match_candidates = '[]'::jsonb, ocr_regions = NULL, ocr_page_index = NULL, last_error = NULL, reviewed_by = NULL, reviewed_at = NULL, review_note = NULL WHERE id = $1 AND status <> 'promoted'`, [id]);
  return getIngestById(id);
}

export async function rejectIngest(id, reason, reviewedBy) {
  await query(`UPDATE ingest_queue SET review_status = 'Rejected', status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_note = $2 WHERE id = $3 AND status <> 'promoted'`, [reviewedBy || null, String(reason || "Rejected during review"), id]);
  return getIngestById(id);
}

export async function findDuplicateIngest(id, contentSha256) {
  if (!contentSha256) return null;
  return queryOne(`SELECT id, original_filename, promoted_document_id FROM ingest_queue WHERE content_sha256 = $1 AND id <> $2 AND status = 'promoted' LIMIT 1`, [contentSha256, id]);
}

export async function abandonAllPendingIngest(officeId = null) {
  const params = officeId ? [officeId] : [];
  const officeClause = officeId ? " AND office_id = ?" : "";
  const rows = await dbAll(`SELECT id, storage_filename FROM ingest_queue WHERE status <> 'promoted' AND status <> 'rejected'${officeClause}`, params);
  for (const row of rows) { try { fs.unlinkSync(getIngestFilePath(row.storage_filename)); } catch {} }
  const res = await dbRun(`UPDATE ingest_queue SET status = 'abandoned', review_status = 'Rejected', last_error = NULL WHERE status <> 'promoted' AND status <> 'rejected'${officeClause}`, params);
  return { clearedCount: rows.length, updatedRows: res.changes || 0 };
}

export function getIngestFilePath(storageFilename) {
  return path.join(getIngestDir(), path.basename(String(storageFilename || "")));
}

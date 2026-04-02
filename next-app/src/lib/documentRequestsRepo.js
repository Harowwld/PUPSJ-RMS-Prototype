import { dbAll, dbGet, dbRun } from "./sqlite.js";

const VALID_STATUSES = new Set([
  "Pending",
  "InProgress",
  "Ready",
  "Completed",
  "Cancelled",
]);

export function isValidRequestStatus(s) {
  return VALID_STATUSES.has(String(s || ""));
}

export async function listDocumentRequests({
  q = "",
  status = "",
  studentNo = "",
  limit = 50,
  offset = 0,
} = {}) {
  const filters = [];
  const params = [];

  if (status) {
    filters.push("dr.status = ?");
    params.push(status);
  }
  if (studentNo) {
    filters.push("dr.student_no = ?");
    params.push(studentNo);
  }
  if (q) {
    filters.push(
      "(dr.student_no LIKE ? OR s.name LIKE ? OR dr.doc_type LIKE ? OR IFNULL(dr.notes,'') LIKE ?)"
    );
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const off = Math.max(parseInt(offset, 10) || 0, 0);

  return await dbAll(
    `
    SELECT
      dr.*,
      s.name AS student_name
    FROM document_requests dr
    JOIN students s ON s.student_no = dr.student_no
    ${where}
    ORDER BY dr.created_at DESC, dr.id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, lim, off]
  );
}

export async function countDocumentRequests({
  q = "",
  status = "",
  studentNo = "",
} = {}) {
  const filters = [];
  const params = [];

  if (status) {
    filters.push("dr.status = ?");
    params.push(status);
  }
  if (studentNo) {
    filters.push("dr.student_no = ?");
    params.push(studentNo);
  }
  if (q) {
    filters.push(
      "(dr.student_no LIKE ? OR s.name LIKE ? OR dr.doc_type LIKE ? OR IFNULL(dr.notes,'') LIKE ?)"
    );
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const row = await dbGet(
    `
    SELECT COUNT(*) AS c
    FROM document_requests dr
    JOIN students s ON s.student_no = dr.student_no
    ${where}
    `,
    params
  );
  return Number(row?.c) || 0;
}

export async function getDocumentRequestById(id) {
  const row = await dbGet(
    `
    SELECT
      dr.*,
      s.name AS student_name
    FROM document_requests dr
    JOIN students s ON s.student_no = dr.student_no
    WHERE dr.id = ?
    `,
    [id]
  );
  return row || null;
}

export async function createDocumentRequest({
  studentNo,
  docType,
  notes,
  createdBy,
  linkedDocumentId = null,
}) {
  const sn = String(studentNo || "").trim();
  const dt = String(docType || "").trim();
  if (!sn || !dt) return null;

  const lid =
    linkedDocumentId != null && Number.isFinite(Number(linkedDocumentId))
      ? Number(linkedDocumentId)
      : null;

  const res = await dbRun(
    `
    INSERT INTO document_requests (
      student_no, doc_type, status, notes, linked_document_id, created_by, updated_by
    ) VALUES (?, ?, 'Pending', ?, ?, ?, ?)
    `,
    [sn, dt, notes ?? null, lid, createdBy ?? null, createdBy ?? null]
  );
  const id = res.lastInsertRowid;
  if (!id) return null;
  return await getDocumentRequestById(id);
}

export async function updateDocumentRequest(id, fields) {
  const existing = await dbGet("SELECT id FROM document_requests WHERE id = ?", [
    id,
  ]);
  if (!existing) return null;

  const cols = [];
  const vals = [];

  if (fields.status !== undefined) {
    const s = String(fields.status || "");
    if (!isValidRequestStatus(s)) return null;
    cols.push("status = ?");
    vals.push(s);
  }
  if (fields.notes !== undefined) {
    cols.push("notes = ?");
    vals.push(fields.notes);
  }
  if (fields.linkedDocumentId !== undefined) {
    cols.push("linked_document_id = ?");
    const v = fields.linkedDocumentId;
    vals.push(
      v === null || v === "" || !Number.isFinite(Number(v))
        ? null
        : Number(v)
    );
  }
  if (fields.updatedBy !== undefined) {
    cols.push("updated_by = ?");
    vals.push(fields.updatedBy);
  }

  if (cols.length === 0) return await getDocumentRequestById(id);

  vals.push(id);
  await dbRun(
    `UPDATE document_requests SET ${cols.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
    vals
  );
  return await getDocumentRequestById(id);
}

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dbAll, dbGet, dbRun } from "./sqlite.js";

let reviewColumnsEnsured = false;

async function ensureReviewColumns() {
  if (reviewColumnsEnsured) return;
  try {
    const cols = await dbAll("PRAGMA table_info(documents)");
    const names = new Set((cols || []).map((c) => String(c?.name || "")));
    if (!names.has("approval_status")) {
      await dbRun(
        "ALTER TABLE documents ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'Pending'"
      );
    }
    if (!names.has("reviewed_by")) {
      await dbRun("ALTER TABLE documents ADD COLUMN reviewed_by TEXT");
    }
    if (!names.has("reviewed_at")) {
      await dbRun("ALTER TABLE documents ADD COLUMN reviewed_at TEXT");
    }
    if (!names.has("review_note")) {
      await dbRun("ALTER TABLE documents ADD COLUMN review_note TEXT");
    }
    await dbRun(
      "UPDATE documents SET approval_status = 'Approved' WHERE approval_status IS NULL OR approval_status = ''"
    );
    await dbRun(
      "CREATE INDEX IF NOT EXISTS idx_documents_approval_status ON documents(approval_status)"
    );
  } catch {
    // Avoid breaking all reads/writes if schema repair fails once.
  } finally {
    reviewColumnsEnsured = true;
  }
}

function getLocalDir() {
  return process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");
}

export function getUploadsDir() {
  const dir = path.join(getLocalDir(), "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function createDocument({
  studentNo,
  studentName,
  docType,
  originalFilename,
  mimeType,
  sizeBytes,
  buffer,
  storageFilename: providedStorageFilename,
}) {
  await ensureReviewColumns();

  const ext = path.extname(originalFilename || "").toLowerCase() || ".pdf";
  const storageFilename =
    providedStorageFilename || `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const absPath = path.join(getUploadsDir(), storageFilename);
  if (buffer) {
    fs.writeFileSync(absPath, buffer);
  }

  const res = await dbRun(
    `
    INSERT INTO documents (
      student_no,
      student_name,
      doc_type,
      original_filename,
      storage_filename,
      mime_type,
      size_bytes,
      approval_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      studentNo,
      studentName || null,
      docType,
      originalFilename,
      storageFilename,
      mimeType,
      sizeBytes,
      "Pending",
    ]
  );

  return await getDocumentById(res.lastInsertRowid);
}

export async function listDocuments({
  q,
  studentNo,
  docType,
  approvalStatus,
  excludeDeclined,
  limit = 50,
  offset = 0,
} = {}) {
  await ensureReviewColumns();

  const filters = [];
  const params = [];

  if (studentNo) {
    filters.push("student_no = ?");
    params.push(studentNo);
  }

  if (docType) {
    filters.push("doc_type = ?");
    params.push(docType);
  }

  if (approvalStatus) {
    filters.push("approval_status = ?");
    params.push(approvalStatus);
  } else if (excludeDeclined) {
    filters.push("(approval_status IS NULL OR approval_status != 'Declined')");
  }

  if (q) {
    filters.push(
      "(student_no LIKE ? OR student_name LIKE ? OR doc_type LIKE ? OR original_filename LIKE ?)"
    );
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const off = Math.max(parseInt(offset) || 0, 0);

  return await dbAll(
    `
      SELECT *
      FROM documents
      ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, lim, off]
  );
}

export async function getDocumentById(id) {
  await ensureReviewColumns();
  const row = await dbGet("SELECT * FROM documents WHERE id = ?", [id]);
  return row || null;
}

export async function updateDocumentMetadata(id, { studentNo, studentName, docType }) {
  await ensureReviewColumns();
  const existing = await getDocumentById(id);
  if (!existing) return null;

  const nextStudentNo = studentNo ?? existing.student_no;
  const nextStudentName = studentName ?? existing.student_name;
  const nextDocType = docType ?? existing.doc_type;

  await dbRun(
    `UPDATE documents
     SET student_no = ?, student_name = ?, doc_type = ?
     WHERE id = ?`,
    [nextStudentNo, nextStudentName, nextDocType, id]
  );

  return await getDocumentById(id);
}

export async function replaceDocumentFile(
  id,
  { originalFilename, mimeType, sizeBytes, buffer }
) {
  await ensureReviewColumns();
  const existing = await getDocumentById(id);
  if (!existing) return null;

  const ext = path.extname(originalFilename || "").toLowerCase() || ".pdf";
  const storageFilename = `${Date.now()}-${crypto
    .randomBytes(8)
    .toString("hex")}${ext}`;
  const absPath = path.join(getUploadsDir(), storageFilename);
  fs.writeFileSync(absPath, buffer);

  const prevAbsPath = path.join(getUploadsDir(), existing.storage_filename);
  try {
    fs.unlinkSync(prevAbsPath);
  } catch {
    // ignore missing file
  }

  await dbRun(
    `UPDATE documents
     SET original_filename = ?,
         storage_filename = ?,
         mime_type = ?,
         size_bytes = ?,
         approval_status = 'Pending',
         reviewed_by = NULL,
         reviewed_at = NULL,
         review_note = NULL
     WHERE id = ?`,
    [originalFilename, storageFilename, mimeType, sizeBytes, id]
  );

  return await getDocumentById(id);
}

export async function reviewDocument(id, { approvalStatus, reviewedBy, reviewNote }) {
  await ensureReviewColumns();
  const existing = await getDocumentById(id);
  if (!existing) return null;

  await dbRun(
    `UPDATE documents
     SET approval_status = ?,
         reviewed_by = ?,
         reviewed_at = datetime('now'),
         review_note = ?
     WHERE id = ?`,
    [approvalStatus, reviewedBy || null, reviewNote || null, id]
  );

  return await getDocumentById(id);
}

export async function declineDocumentAndRemoveFile(id, { reviewedBy, reviewNote }) {
  await ensureReviewColumns();
  const existing = await getDocumentById(id);
  if (!existing) return null;

  // Keep DB row for review/history, but remove the physical file.
  const absPath = path.join(getUploadsDir(), existing.storage_filename);
  try {
    fs.unlinkSync(absPath);
  } catch {
    // ignore missing file
  }

  await dbRun(
    `UPDATE documents
     SET approval_status = 'Declined',
         reviewed_by = ?,
         reviewed_at = datetime('now'),
         review_note = ?
     WHERE id = ?`,
    [reviewedBy || null, reviewNote || null, id]
  );

  return await getDocumentById(id);
}

export async function deleteDocument(id) {
  const row = await getDocumentById(id);
  if (!row) return null;

  await dbRun("DELETE FROM documents WHERE id = ?", [id]);

  const absPath = path.join(getUploadsDir(), row.storage_filename);
  try {
    fs.unlinkSync(absPath);
  } catch {
    // ignore missing file
  }

  return row;
}

export function getDocumentFilePath(row) {
  return path.join(getUploadsDir(), row.storage_filename);
}

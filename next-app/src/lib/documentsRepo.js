import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dbAll, dbGet, dbRun } from "./sqlite";

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
}) {
  const ext = path.extname(originalFilename || "").toLowerCase() || ".pdf";
  const storageFilename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const absPath = path.join(getUploadsDir(), storageFilename);

  fs.writeFileSync(absPath, buffer);

  const res = await dbRun(
    `
    INSERT INTO documents (
      student_no,
      student_name,
      doc_type,
      original_filename,
      storage_filename,
      mime_type,
      size_bytes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    [
      studentNo,
      studentName || null,
      docType,
      originalFilename,
      storageFilename,
      mimeType,
      sizeBytes,
    ]
  );

  return await getDocumentById(res.lastInsertRowid);
}

export async function listDocuments({
  q,
  studentNo,
  docType,
  limit = 50,
  offset = 0,
} = {}) {
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
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, lim, off]
  );
}

export async function getDocumentById(id) {
  const row = await dbGet("SELECT * FROM documents WHERE id = ?", [id]);
  return row || null;
}

export async function updateDocumentMetadata(id, { studentNo, studentName, docType }) {
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

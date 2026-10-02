import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import { decryptPII } from "./piiEncryption.js";

let reviewColumnsEnsured = false;

function decryptDocumentRow(row) {
  if (!row) return row;
  if (row.student_name) {
    row.student_name = decryptPII(row.student_name);
  }
  return row;
}

async function ensureReviewColumns() {
  reviewColumnsEnsured = true;
}

function getLocalDir() {
  return process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");
}

const officeStorageMap = new Map();

function isSafeStorageFilename(value) {
  const normalized = String(value || "").trim().replace(/\\/g, "/");
  return Boolean(normalized) && path.posix.basename(normalized) === normalized;
}

function requireOfficeId(officeId) {
  const value = String(officeId || "").trim().toLowerCase();
  if (!value) throw new Error("Document office scope is required.");
  return value;
}

export function setOfficeStoragePath(officeId, storagePath) {
  if (officeId && storagePath) {
    officeStorageMap.set(String(officeId).toLowerCase(), storagePath);
  }
}

export function getUploadsDir(officeId = null) {
  if (officeId) {
    const custom = officeStorageMap.get(String(officeId).toLowerCase());
    if (custom) {
      const dir = path.isAbsolute(custom) ? custom : path.join(/*turbopackIgnore: true*/ process.cwd(), custom);
      fs.mkdirSync(dir, { recursive: true });
      return dir;
    }
  }
  const base = getLocalDir();
  const dir = officeId
    ? path.join(base, "storage", String(officeId).toLowerCase(), "uploads")
    : path.join(base, "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function createDocument({
  officeId = null,
  studentNo,
  studentName,
  organizationId = null,
  docType,
  originalFilename,
  mimeType,
  sizeBytes,
  buffer,
  storageFilename: providedStorageFilename,
  uploadedBy,
}) {
  await ensureReviewColumns();
  if (!officeId) throw new Error("Document office scope is required.");

  let effectiveOrgId = organizationId ? String(organizationId).trim() : null;
  let effectiveStudentNo = studentNo ? String(studentNo).trim().toUpperCase() : null;
  let effectiveStudentName = studentName ? String(studentName).trim() : null;

  if (officeId === "osas") {
    const orgKey = effectiveOrgId || effectiveStudentNo;
    if (orgKey) {
      const org = await dbGet(
        `SELECT id, name, acronym, storage_room, storage_cabinet, storage_drawer
           FROM student_organizations
          WHERE lower(id) = lower(?) OR lower(coalesce(acronym, '')) = lower(?)`,
        [orgKey, orgKey]
      );
      if (org) {
        effectiveOrgId = org.id;
        if (!effectiveStudentName) effectiveStudentName = org.name;
      }
    }

    if (!effectiveOrgId) {
      const student = await dbGet(
        `SELECT s.student_no
           FROM students s
          WHERE s.student_no = ?
            AND EXISTS (SELECT 1 FROM student_office_memberships som
                         WHERE som.student_no = s.student_no
                           AND som.office_id = ?
                           AND som.status = 'Active')`,
        [effectiveStudentNo, officeId],
      );
      if (!student) {
        throw new Error("Student organization is not recognized by OSAS.");
      }
    }
  } else {
    const student = await dbGet(
      `SELECT s.student_no
         FROM students s
        WHERE s.student_no = ?
          AND EXISTS (SELECT 1 FROM student_office_memberships som
                       WHERE som.student_no = s.student_no
                         AND som.office_id = ?
                         AND som.status = 'Active')`,
      [effectiveStudentNo, officeId],
    );
    if (!student) throw new Error("Student is not assigned to this office.");
  }

  const documentType = await dbGet(
    `SELECT id FROM document_types
      WHERE office_id = ? AND lower(name) = lower(?) AND status = 'Active'`,
    [officeId, docType],
  );
  if (!documentType) throw new Error("Document type is not available in this office.");

  try {
    const { getOfficeById } = await import("./officesRepo.js");
    const office = await getOfficeById(officeId);
    if (office?.storage_path) {
      setOfficeStoragePath(officeId, office.storage_path);
    }
  } catch {}

  let verifiedStudentNo = null;
  if (effectiveStudentNo) {
    const studentExists = await dbGet(
      `SELECT student_no FROM students WHERE student_no = ?`,
      [effectiveStudentNo]
    );
    if (studentExists) {
      verifiedStudentNo = effectiveStudentNo;
    }
  }

  const cleanEntityId = String(effectiveOrgId || effectiveStudentNo || "UNKNOWN").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "_");
  const cleanDocType = String(docType || "DOCUMENT").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "_");
  const ext = path.extname(originalFilename || "").toLowerCase() || ".pdf";
  const storageFilename =
    providedStorageFilename || `${cleanEntityId}_${cleanDocType}_${Date.now()}${ext}`;
  if (!isSafeStorageFilename(storageFilename)) {
    throw new Error("Invalid document storage filename.");
  }
  const absPath = path.join(getUploadsDir(officeId), storageFilename);
  if (buffer) {
    fs.writeFileSync(absPath, buffer);
  }

  const res = await dbRun(
    `
    INSERT INTO documents (
      office_id,
      student_no,
      student_name,
      organization_id,
      doc_type,
      original_filename,
      storage_filename,
      mime_type,
      size_bytes,
      approval_status,
      uploaded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      officeId,
      verifiedStudentNo,
      effectiveStudentName || null,
      effectiveOrgId || null,
      docType,
      originalFilename,
      storageFilename,
      mimeType,
      sizeBytes,
      "Pending",
      uploadedBy || null,
    ]
  );

  return await getDocumentById(res.lastInsertRowid, { officeId });
}

export async function listDocuments({
  officeId,
  q,
  studentNo,
  organizationId,
  docType,
  approvalStatus,
  excludeDeclined,
  limit = 50,
  offset = 0,
} = {}) {
  await ensureReviewColumns();

  const filters = [];
  const params = [];

  if (officeId) {
    filters.push("d.office_id = ?");
    params.push(officeId);
  }

  if (studentNo) {
    filters.push("(d.student_no = ? OR d.organization_id = ?)");
    params.push(studentNo, studentNo);
  }

  if (organizationId) {
    filters.push("d.organization_id = ?");
    params.push(organizationId);
  }

  if (docType) {
    filters.push("d.doc_type = ?");
    params.push(docType);
  }

  if (approvalStatus) {
    filters.push("d.approval_status = ?");
    params.push(approvalStatus);
  } else if (excludeDeclined) {
    filters.push("(d.approval_status IS NULL OR d.approval_status != 'Declined')");
  }

  if (q) {
    filters.push(
      "(d.student_no LIKE ? OR d.student_name LIKE ? OR d.doc_type LIKE ? OR d.original_filename LIKE ? OR so.name LIKE ? OR so.acronym LIKE ?)"
    );
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const off = Math.max(parseInt(offset) || 0, 0);

  const rows = await dbAll(
    `
      SELECT d.*, so.acronym AS org_acronym, so.name AS organization_name
      FROM documents d
      LEFT JOIN student_organizations so ON so.id = d.organization_id
      ${where}
      ORDER BY d.created_at DESC, d.id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, lim, off]
  );
  return (rows || []).map(decryptDocumentRow);
}

export async function getDocumentById(id, { officeId } = {}) {
  await ensureReviewColumns();
  const filters = ["d.id = ?"];
  const params = [id];
  if (officeId) {
    filters.push("d.office_id = ?");
    params.push(officeId);
  }
  const row = await dbGet(
    `SELECT d.*, so.acronym AS org_acronym, so.name AS organization_name
     FROM documents d
     LEFT JOIN student_organizations so ON so.id = d.organization_id
     WHERE ${filters.join(" AND ")}`,
    params
  );
  return decryptDocumentRow(row) || null;
}

export async function updateDocumentMetadata(id, { studentNo, studentName, organizationId, docType, isPreviewed }, { officeId } = {}) {
  await ensureReviewColumns();
  const scopedOfficeId = requireOfficeId(officeId);
  const existing = await getDocumentById(id, { officeId: scopedOfficeId });
  if (!existing) return null;

  const nextOrgId = organizationId !== undefined ? organizationId : existing.organization_id;
  const nextStudentNo = studentNo ?? existing.student_no;
  const nextStudentName = studentName ?? existing.student_name;
  const nextDocType = docType ?? existing.doc_type;
  const nextIsPreviewed = isPreviewed !== undefined
    ? Boolean(isPreviewed)
    : Boolean(existing.is_previewed);

  if (scopedOfficeId === "osas") {
    if (nextOrgId) {
      const org = await dbGet(
        `SELECT id, name, acronym FROM student_organizations WHERE lower(id) = lower(?) OR lower(coalesce(acronym, '')) = lower(?)`,
        [nextOrgId, nextOrgId]
      );
      if (!org) throw new Error("Student organization is not recognized by OSAS.");
    }
  } else {
    const student = await dbGet(
      `SELECT s.student_no
         FROM students s
        WHERE s.student_no = ?
          AND EXISTS (SELECT 1 FROM student_office_memberships som
                       WHERE som.student_no = s.student_no
                         AND som.office_id = ?
                         AND som.status = 'Active')`,
      [String(nextStudentNo || "").trim().toUpperCase(), scopedOfficeId],
    );
    if (!student) throw new Error("Student is not assigned to this office.");
  }

  const documentType = await dbGet(
    `SELECT id FROM document_types
      WHERE office_id = ? AND lower(name) = lower(?) AND status = 'Active'`,
    [scopedOfficeId, nextDocType],
  );
  if (!documentType) throw new Error("Document type is not available in this office.");

  let verifiedStudentNo = null;
  if (nextStudentNo) {
    const studentExists = await dbGet(
      `SELECT student_no FROM students WHERE student_no = ?`,
      [nextStudentNo]
    );
    if (studentExists) {
      verifiedStudentNo = nextStudentNo;
    }
  }

  await dbRun(
    `UPDATE documents
     SET student_no = ?, student_name = ?, organization_id = ?, doc_type = ?, is_previewed = ?
     WHERE id = ? AND office_id = ?`,
    [verifiedStudentNo, nextStudentName, nextOrgId || null, nextDocType, nextIsPreviewed, id, scopedOfficeId]
  );

  return await getDocumentById(id, { officeId: scopedOfficeId });
}

export async function replaceDocumentFile(
  id,
  { originalFilename, mimeType, sizeBytes, buffer },
  { officeId } = {},
) {
  await ensureReviewColumns();
  const scopedOfficeId = requireOfficeId(officeId);
  const existing = await getDocumentById(id, { officeId: scopedOfficeId });
  if (!existing) return null;

  const cleanStudentNo = String(existing.student_no || "UNKNOWN").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "_");
  const cleanDocType = String(existing.doc_type || "DOCUMENT").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "_");
  const ext = path.extname(originalFilename || "").toLowerCase() || ".pdf";
  const storageFilename = `${cleanStudentNo}_${cleanDocType}_${Date.now()}${ext}`;
  const absPath = path.join(getUploadsDir(existing.office_id), storageFilename);
  fs.writeFileSync(absPath, buffer);

  const prevAbsPath = path.join(getUploadsDir(existing.office_id), existing.storage_filename);
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
     WHERE id = ? AND office_id = ?`,
    [originalFilename, storageFilename, mimeType, sizeBytes, id, scopedOfficeId]
  );

  return await getDocumentById(id, { officeId: scopedOfficeId });
}

export async function reviewDocument(id, { approvalStatus, reviewedBy, reviewNote }, { officeId } = {}) {
  await ensureReviewColumns();
  const scopedOfficeId = requireOfficeId(officeId);
  const existing = await getDocumentById(id, { officeId: scopedOfficeId });
  if (!existing) return null;

  await dbRun(
    `UPDATE documents
     SET approval_status = ?,
         reviewed_by = ?,
         reviewed_at = datetime('now'),
         review_note = ?
     WHERE id = ? AND office_id = ?`,
    [approvalStatus, reviewedBy || null, reviewNote || null, id, scopedOfficeId]
  );

  return await getDocumentById(id, { officeId: scopedOfficeId });
}

export async function declineDocumentAndRemoveFile(id, { reviewedBy, reviewNote }, { officeId } = {}) {
  await ensureReviewColumns();
  const scopedOfficeId = requireOfficeId(officeId);
  const existing = await getDocumentById(id, { officeId: scopedOfficeId });
  if (!existing) return null;

  // Keep DB row and preserve the physical file for previewing and re-scanning
  await dbRun(
    `UPDATE documents
     SET approval_status = 'Declined',
         reviewed_by = ?,
         reviewed_at = datetime('now'),
         review_note = ?
     WHERE id = ? AND office_id = ?`,
    [reviewedBy || null, reviewNote || null, id, scopedOfficeId]
  );

  return await getDocumentById(id, { officeId: scopedOfficeId });
}

export async function deleteDocument(id, { officeId } = {}) {
  const scopedOfficeId = requireOfficeId(officeId);
  const row = await getDocumentById(id, { officeId: scopedOfficeId });
  if (!row) return null;

  await dbRun("DELETE FROM documents WHERE id = ? AND office_id = ?", [id, scopedOfficeId]);

  const filePath = getDocumentFilePath(row);
  if (filePath) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore missing file
    }
  }

  return row;
}

export function getDocumentFilePath(row) {
  if (!row?.storage_filename || !row?.office_id) return null;
  const officeId = row.office_id;
  const storageFilename = String(row.storage_filename).trim().replace(/\\/g, "/");
  if (!isSafeStorageFilename(storageFilename)) return null;
  const configuredPath = path.join(getUploadsDir(officeId), storageFilename);
  if (fs.existsSync(configuredPath)) {
    return configuredPath;
  }
  const defaultPartitionedPath = path.join(getLocalDir(), "storage", String(officeId).toLowerCase(), "uploads", storageFilename);
  if (fs.existsSync(defaultPartitionedPath)) {
    return defaultPartitionedPath;
  }
  const legacyPath = path.join(getLocalDir(), "uploads", storageFilename);
  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }
  return configuredPath;
}

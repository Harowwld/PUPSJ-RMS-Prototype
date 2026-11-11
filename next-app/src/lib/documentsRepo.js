import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import { query, queryOne, transaction } from "./postgres.js";
import { decryptPII } from "./piiEncryption.js";
import { matchesSearchQuery } from "./searchUtils.js";
import { getLocalDataDir, getOfficeUploadsDir } from "./officePaths.js";
import {
  DOCUMENT_MAX_SIZE_BYTES,
  DOCUMENT_MAX_SIZE_LABEL,
  HOT_FOLDER_MAX_SIZE_BYTES,
  HOT_FOLDER_MAX_SIZE_LABEL,
  formatBytes,
} from "./uploadLimits.js";

function decryptDocumentRow(row) {
  if (!row) return row;
  if (row.student_name) {
    const dec = decryptPII(row.student_name);
    row.student_name = dec && !dec.startsWith("enc:v1:") ? dec : (row.student_no ? `Student (${row.student_no})` : "Student");
  }
  return row;
}

async function ensureReviewColumns() {}

function getLocalDir() {
  return getLocalDataDir();
}

function isSafeStorageFilename(value) {
  const normalized = String(value || "").trim().replace(/\\/g, "/");
  return Boolean(normalized) && path.posix.basename(normalized) === normalized;
}

function requireOfficeId(officeId) {
  const value = String(officeId || "").trim().toLowerCase();
  if (!value) throw new Error("Document office scope is required.");
  return value;
}

export function getUploadsDir(officeId = null) {
  const dir = officeId ? getOfficeUploadsDir(officeId) : path.join(getLocalDir(), "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function findDuplicateActiveDocument({
  officeId,
  studentNo = null,
  organizationId = null,
  docType,
}) {
  if (!officeId || !docType) return null;
  const effectiveOrgId = organizationId ? String(organizationId).trim() : null;
  const effectiveStudentNo = studentNo ? String(studentNo).trim().toUpperCase() : null;

  if (effectiveStudentNo) {
    return await dbGet(
      `SELECT id, approval_status, original_filename, storage_filename, doc_type, created_at
         FROM documents
        WHERE office_id = ?
          AND student_no = ?
          AND lower(doc_type) = lower(?)
          AND (approval_status IS NULL OR approval_status != 'Declined')
        ORDER BY id DESC
        LIMIT 1`,
      [officeId, effectiveStudentNo, String(docType).trim()]
    );
  }

  if (effectiveOrgId) {
    return await dbGet(
      `SELECT id, approval_status, original_filename, storage_filename, doc_type, created_at
         FROM documents
        WHERE office_id = ?
          AND organization_id = ?
          AND lower(doc_type) = lower(?)
          AND (approval_status IS NULL OR approval_status != 'Declined')
        ORDER BY id DESC
        LIMIT 1`,
      [officeId, effectiveOrgId, String(docType).trim()]
    );
  }

  return null;
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
  sourceIngestId = null,
  allowOverwrite = false,
  replaceDocumentId = null,
}) {
  await ensureReviewColumns();
  if (!officeId) throw new Error("Document office scope is required.");

  const effectiveSizeBytes = Number(sizeBytes ?? buffer?.length ?? 0);
  const maxAllowedBytes = sourceIngestId ? HOT_FOLDER_MAX_SIZE_BYTES : DOCUMENT_MAX_SIZE_BYTES;
  const maxLabel = sourceIngestId ? HOT_FOLDER_MAX_SIZE_LABEL : DOCUMENT_MAX_SIZE_LABEL;
  if (effectiveSizeBytes > maxAllowedBytes) {
    const error = new Error(`Document file size (${formatBytes(effectiveSizeBytes)}) exceeds the ${maxLabel} limit.`);
    error.status = 413;
    error.code = "PAYLOAD_TOO_LARGE";
    throw error;
  }

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

  let existingActiveDoc = await findDuplicateActiveDocument({
    officeId,
    studentNo: verifiedStudentNo || effectiveStudentNo,
    organizationId: effectiveOrgId,
    docType,
  });

  if (!existingActiveDoc && allowOverwrite && replaceDocumentId) {
    const candidate = await getDocumentById(replaceDocumentId, { officeId });
    if (candidate) {
      existingActiveDoc = candidate;
    }
  }

  if (existingActiveDoc) {
    if (allowOverwrite) {
      return await replaceDocumentFile(
        existingActiveDoc.id,
        {
          originalFilename,
          mimeType,
          sizeBytes,
          buffer,
          studentNo: verifiedStudentNo || effectiveStudentNo,
          studentName: effectiveStudentName,
          docType,
          organizationId: effectiveOrgId,
        },
        { officeId }
      );
    }

    const entityLabel = effectiveOrgId ? "organization" : "student";
    const statusLabel = existingActiveDoc.approval_status || "Pending";
    const err = new Error(
      `A document of type '${docType}' is already registered for this ${entityLabel} (${statusLabel}). Each record maintains a single digital twin of the original physical document.`
    );
    err.code = "DUPLICATE_DOCUMENT";
    err.isDuplicate = true;
    err.duplicateId = existingActiveDoc.id;
    err.existingStatus = existingActiveDoc.approval_status;
    throw err;
  }

  const cleanEntityId = String(effectiveOrgId || effectiveStudentNo || "UNKNOWN").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "_");
  const cleanDocType = String(docType || "DOCUMENT").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "_");
  const ext = path.extname(originalFilename || "").toLowerCase() || ".pdf";
  const entropy = crypto.randomBytes(4).toString("hex");
  const storageFilename =
    providedStorageFilename || `${cleanEntityId}_${cleanDocType}_${Date.now()}_${entropy}${ext}`;
  if (!isSafeStorageFilename(storageFilename)) {
    throw new Error("Invalid document storage filename.");
  }
  const absPath = path.join(getUploadsDir(officeId), storageFilename);
  const fileAlreadyExisted = fs.existsSync(absPath);
  if (buffer) {
    await fs.promises.writeFile(absPath, buffer);
  }

  let res;
  try {
    res = await dbRun(
      `
    INSERT INTO documents (
      office_id,
      student_no,
      student_name,
      organization_id,
      doc_type,
      original_filename,
      storage_filename,
      source_ingest_id,
      mime_type,
      size_bytes,
      approval_status,
      uploaded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        officeId,
        verifiedStudentNo,
        effectiveStudentName || null,
        effectiveOrgId || null,
        docType,
        originalFilename,
        storageFilename,
        sourceIngestId,
        mimeType,
        sizeBytes,
        "Pending",
        uploadedBy || null,
      ],
    );
  } catch (error) {
    if (buffer && !fileAlreadyExisted && fs.existsSync(absPath)) {
      try {
        await fs.promises.unlink(absPath);
      } catch {
        // Preserve the database error; a failed cleanup can be retried separately.
      }
    }
    throw error;
  }

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
    const rawQ = String(q).trim();
    const tokens = rawQ.split(/[\s,]+/).filter(Boolean);
    if (tokens.length > 0) {
      for (const tok of tokens) {
        filters.push(
          "(d.student_no ILIKE ? OR REPLACE(d.student_no, '-', '') ILIKE ? OR d.student_name ILIKE ? OR REPLACE(COALESCE(d.student_name, ''), ',', ' ') ILIKE ? OR d.doc_type ILIKE ? OR d.original_filename ILIKE ? OR so.name ILIKE ? OR so.acronym ILIKE ?)"
        );
        const like = `%${tok}%`;
        const strippedTok = tok.replace(/-/g, "");
        params.push(like, `%${strippedTok}%`, like, like, like, like, like, like);
      }
    }
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

export async function listArchiveDocuments({ officeId, q = "", year, page = 1, pageSize = 10 }) {
  await ensureReviewColumns();
  const params = [officeId];
  const conditions = ["d.office_id = $1", "d.approval_status <> 'Declined'"];
  if (year) {
    params.push(String(year));
    conditions.push(`split_part(d.student_no, '-', 1) = $${params.length}`);
  }
  const where = `WHERE ${conditions.join(" AND ")}`;
  const search = String(q || "").trim();
  if (search) {
    const rows = (await query(`SELECT d.* FROM documents d ${where} ORDER BY d.created_at DESC, d.id DESC`, params)).map(decryptDocumentRow);
    const matched = rows.filter((doc) => matchesSearchQuery([doc.student_no, doc.student_name, doc.doc_type, doc.original_filename], search));
    return { rows: matched.slice((page - 1) * pageSize, page * pageSize), total: matched.length };
  }
  const total = Number((await queryOne(`SELECT count(*)::int AS total FROM documents d ${where}`, params))?.total || 0);
  params.push(pageSize, (page - 1) * pageSize);
  const rows = await query(`SELECT d.* FROM documents d ${where} ORDER BY d.created_at DESC, d.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  return { rows: rows.map(decryptDocumentRow), total };
}

export async function listOsasArchiveDocuments({ q = "", organizationId, page = 1, pageSize = 10, allForOrganization = false }) {
  const params = [];
  const conditions = [];
  if (organizationId) {
    params.push(organizationId);
    conditions.push(`archive_docs.organization_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const cte = `WITH archive_docs AS (
    SELECT d.id::text AS id, d.office_id, d.student_no, d.student_name, d.organization_id,
      coalesce(so.name, d.student_name) AS organization_name, so.acronym AS org_acronym,
      d.doc_type, d.original_filename, d.mime_type, d.size_bytes, d.approval_status,
      d.created_at, null::text AS source_type, null::bigint AS source_id
    FROM documents d LEFT JOIN student_organizations so ON so.id = d.organization_id
    WHERE d.office_id = 'osas' AND d.approval_status <> 'Declined'
    UNION ALL
    SELECT ('event-proposal-' || ep.id)::text AS id, ep.office_id, ep.student_no,
      coalesce(sip.display_name, s.name, ep.student_no) AS student_name, ep.organization_id,
      coalesce(so.name, ep.organization_name) AS organization_name, so.acronym AS org_acronym,
      'Event Proposal'::text AS doc_type, ep.original_filename, ep.mime_type, ep.size_bytes,
      CASE WHEN ep.status = 'Approved' THEN 'Approved' ELSE 'Pending' END AS approval_status,
      ep.created_at, 'event_proposal'::text AS source_type, ep.id AS source_id
    FROM event_proposals ep
    LEFT JOIN students s ON s.student_no = ep.student_no
    LEFT JOIN student_identity_profiles sip ON sip.id = ep.identity_profile_id
    LEFT JOIN student_organizations so ON so.id = ep.organization_id
    WHERE ep.office_id = 'osas' AND ep.archived_at IS NULL AND ep.status <> 'Archived'
  )`;
  const from = `FROM archive_docs ${where}`;
  const search = String(q || "").trim();
  const normalize = (row) => ({
    ...decryptDocumentRow(row),
    file_url: row.source_type === "event_proposal" ? `/api/osas/event-proposals/${row.source_id}?file=1` : undefined,
  });
  if (search) {
    const rows = (await query(`${cte} SELECT * ${from} ORDER BY archive_docs.created_at DESC, archive_docs.id DESC`, params)).map(normalize);
    const matched = rows.filter((doc) => matchesSearchQuery([doc.student_no, doc.student_name, doc.organization_name, doc.org_acronym, doc.doc_type, doc.original_filename], search));
    return { rows: allForOrganization ? matched : matched.slice((page - 1) * pageSize, page * pageSize), total: matched.length };
  }
  const total = Number((await queryOne(`${cte} SELECT count(*)::int AS total ${from}`, params))?.total || 0);
  const paging = allForOrganization ? "" : `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const rows = await query(`${cte} SELECT * ${from} ORDER BY archive_docs.created_at DESC, archive_docs.id DESC ${paging}`,
    allForOrganization ? params : [...params, pageSize, (page - 1) * pageSize]);
  return { rows: rows.map(normalize), total };
}

export async function listReviewDocuments({ officeId, page = 1, pageSize = 20, statusFilters = [], docTypeFilters = [], dateFrom, dateTo, filterRules = [], search = "", sortBy = "created_at", sortOrder = "DESC" }) {
  const conditions = [];
  const params = [];
  const add = (value) => { params.push(value); return `$${params.length}`; };
  if (officeId) conditions.push(`d.office_id = ${add(String(officeId).trim().toLowerCase())}`);
  if (statusFilters.length) conditions.push(`d.approval_status = ANY(${add(statusFilters)}::text[])`);
  if (docTypeFilters.length) conditions.push(`d.doc_type = ANY(${add(docTypeFilters)}::text[])`);
  if (dateFrom) conditions.push(`d.created_at >= (${add(dateFrom)}::date::timestamp AT TIME ZONE 'Asia/Manila')`);
  if (dateTo) conditions.push(`d.created_at < ((${add(dateTo)}::date + 1)::timestamp AT TIME ZONE 'Asia/Manila')`);
  for (const rule of filterRules) {
    const column = rule.fieldKey === "status" ? "d.approval_status" : rule.fieldKey === "doc_type" ? "d.doc_type" : null;
    if (!column) continue;
    conditions.push(`${column} ${rule.operator === "is_not" ? "<>" : "="} ${add(String(rule.value || ""))}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const from = `FROM documents d LEFT JOIN student_organizations so ON so.id = d.organization_id ${where}`;
  const stats = await queryOne(`SELECT
    count(*)::int AS total,
    count(*) FILTER (WHERE approval_status = 'Pending')::int AS pending,
    count(*) FILTER (WHERE approval_status = 'Approved')::int AS approved,
    count(*) FILTER (WHERE approval_status = 'Declined')::int AS declined,
    count(*) FILTER (WHERE approval_status = 'Pending' AND (created_at AT TIME ZONE 'Asia/Manila')::date = (now() AT TIME ZONE 'Asia/Manila')::date)::int AS pending_today,
    count(*) FILTER (WHERE approval_status = 'Approved' AND (reviewed_at AT TIME ZONE 'Asia/Manila')::date = (now() AT TIME ZONE 'Asia/Manila')::date)::int AS approved_today,
    count(*) FILTER (WHERE approval_status = 'Declined' AND (reviewed_at AT TIME ZONE 'Asia/Manila')::date = (now() AT TIME ZONE 'Asia/Manila')::date)::int AS declined_today
    FROM documents ${officeId ? "WHERE office_id = $1" : ""}`, officeId ? [officeId] : []);
  const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const currentPage = Math.max(1, Number(page) || 1);
  const sortColumns = { created_at: "d.created_at", student_no: "d.student_no", doc_type: "d.doc_type", approval_status: "d.approval_status" };
  const order = sortOrder === "ASC" ? "ASC" : "DESC";
  const queryRows = `SELECT d.*, so.acronym AS org_acronym, so.name AS organization_name ${from}`;
  let rows;
  let total;
  if (search.trim() || sortBy === "student_name") {
    rows = (await query(queryRows, params)).map(decryptDocumentRow);
    if (search.trim()) rows = rows.filter((row) => matchesSearchQuery([row.student_no, row.student_name, row.organization_name, row.org_acronym, row.doc_type, row.original_filename], search));
    const field = sortColumns[sortBy] ? sortBy : "student_name";
    rows.sort((a, b) => {
      const result = String(a[field] || "").toLowerCase().localeCompare(String(b[field] || "").toLowerCase());
      return order === "ASC" ? result : -result;
    });
    total = rows.length;
    rows = rows.slice((currentPage - 1) * size, currentPage * size);
  } else {
    total = Number((await queryOne(`SELECT count(*)::int AS count ${from}`, params))?.count || 0);
    const offset = add((currentPage - 1) * size);
    const limit = add(size);
    rows = (await query(`${queryRows} ORDER BY ${sortColumns[sortBy] || sortColumns.created_at} ${order}, d.id ${order} OFFSET ${offset} LIMIT ${limit}`, params)).map(decryptDocumentRow);
  }
  return { rows, total, stats: {
    total: Number(stats?.total || 0), pending: Number(stats?.pending || 0), totalApproved: Number(stats?.approved || 0), totalDeclined: Number(stats?.declined || 0),
    pendingToday: Number(stats?.pending_today || 0), approvedToday: Number(stats?.approved_today || 0), declinedToday: Number(stats?.declined_today || 0),
  } };
}

export async function countPendingDocuments({ officeId } = {}) {
  const filters = ["approval_status = 'Pending'"];
  const params = [];
  if (officeId) {
    filters.push("office_id = ?");
    params.push(officeId);
  }
  const row = await dbGet(`SELECT COUNT(*)::int AS count FROM documents WHERE ${filters.join(" AND ")}`, params);
  return Number(row?.count || 0);
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

export async function getDocumentBySourceIngestId(sourceIngestId, { officeId } = {}) {
  const scopedOfficeId = requireOfficeId(officeId);
  const row = await dbGet(
    `SELECT d.*, so.acronym AS org_acronym, so.name AS organization_name
       FROM documents d
       LEFT JOIN student_organizations so ON so.id = d.organization_id
      WHERE d.source_ingest_id = ? AND d.office_id = ?`,
    [sourceIngestId, scopedOfficeId],
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
  { originalFilename, mimeType, sizeBytes, buffer, studentNo, studentName, docType, organizationId, isPreviewed },
  { officeId } = {},
) {
  await ensureReviewColumns();
  const effectiveSizeBytes = Number(sizeBytes ?? buffer?.length ?? 0);
  if (effectiveSizeBytes > DOCUMENT_MAX_SIZE_BYTES) {
    const error = new Error(`Replacement document file size (${formatBytes(effectiveSizeBytes)}) exceeds the ${DOCUMENT_MAX_SIZE_LABEL} limit.`);
    error.status = 413;
    error.code = "PAYLOAD_TOO_LARGE";
    throw error;
  }

  const scopedOfficeId = requireOfficeId(officeId);
  const existing = await getDocumentById(id, { officeId: scopedOfficeId });
  if (!existing) return null;

  const nextStudentNo = studentNo ?? existing.student_no;
  const nextStudentName = studentName ?? existing.student_name;
  const nextDocType = docType ?? existing.doc_type;
  const nextIsPreviewed = isPreviewed !== undefined ? Boolean(isPreviewed) : Boolean(existing.is_previewed);
  const nextOrgId = organizationId !== undefined ? organizationId : existing.organization_id;
  if (scopedOfficeId === "osas") {
    if (nextOrgId) {
      const org = await dbGet("SELECT id FROM student_organizations WHERE lower(id) = lower(?) OR lower(coalesce(acronym, '')) = lower(?)", [nextOrgId, nextOrgId]);
      if (!org) throw new Error("Student organization is not recognized by OSAS.");
    }
  } else {
    const student = await dbGet(
      `SELECT s.student_no FROM students s WHERE s.student_no = ? AND EXISTS (
        SELECT 1 FROM student_office_memberships som WHERE som.student_no = s.student_no AND som.office_id = ? AND som.status = 'Active'
      )`,
      [nextStudentNo, scopedOfficeId],
    );
    if (!student) throw new Error("Student is not assigned to this office.");
  }
  const documentType = await dbGet("SELECT id FROM document_types WHERE office_id = ? AND lower(name) = lower(?) AND status = 'Active'", [scopedOfficeId, nextDocType]);
  if (!documentType) throw new Error("Document type is not available in this office.");
  const verifiedStudentNo = nextStudentNo ? await dbGet("SELECT student_no FROM students WHERE student_no = ?", [nextStudentNo]) : null;
  const cleanEntityId = String(nextStudentNo || nextOrgId || "UNKNOWN").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "_");
  const cleanDocType = String(nextDocType || "DOCUMENT").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "_");
  const ext = path.extname(originalFilename || "").toLowerCase() || ".pdf";
  const entropy = crypto.randomBytes(4).toString("hex");
  const storageFilename = `${cleanEntityId}_${cleanDocType}_${Date.now()}_${entropy}${ext}`;
  const absPath = path.join(getUploadsDir(existing.office_id), storageFilename);
  await fs.promises.writeFile(absPath, buffer);
  try {
    await dbRun(
      `UPDATE documents
       SET original_filename = ?,
           storage_filename = ?,
           student_no = ?,
           student_name = ?,
           organization_id = ?,
           doc_type = ?,
           is_previewed = ?,
           mime_type = ?,
           size_bytes = ?,
           approval_status = 'Pending',
           reviewed_by = NULL,
           reviewed_at = NULL,
           review_note = NULL
       WHERE id = ? AND office_id = ?`,
      [originalFilename, storageFilename, verifiedStudentNo?.student_no || null, nextStudentName || null, nextOrgId || null, nextDocType, nextIsPreviewed, mimeType, sizeBytes, id, scopedOfficeId]
    );
  } catch (error) {
    try { await fs.promises.unlink(absPath); } catch {}
    throw error;
  }

  const prevAbsPath = getDocumentFilePath(existing);
  if (prevAbsPath && prevAbsPath !== absPath) {
    try { await fs.promises.unlink(prevAbsPath); } catch {}
  }

  return await getDocumentById(id, { officeId: scopedOfficeId });
}

export async function reviewDocument(id, { approvalStatus, reviewedBy, reviewNote }, { officeId } = {}) {
  await ensureReviewColumns();
  const scopedOfficeId = requireOfficeId(officeId);
  const reviewed = await transaction(async ({ query, queryOne }) => {
    const existing = await queryOne(
      "SELECT * FROM documents WHERE id = $1 AND office_id = $2 FOR UPDATE",
      [id, scopedOfficeId],
    );
    if (!existing) return null;

    if (approvalStatus === "Approved" && (existing.student_no || existing.organization_id)) {
      const entityColumn = existing.student_no ? "student_no" : "organization_id";
      const entityId = existing.student_no || existing.organization_id;
      // Sibling rows need a shared lock: locking only this document permits concurrent duplicate approvals.
      await query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
        JSON.stringify(["document-approval", scopedOfficeId, entityColumn, entityId]),
      ]);
      const duplicate = await queryOne(
        `SELECT id, approval_status FROM documents
          WHERE office_id = $1 AND ${entityColumn} = $2
            AND lower(trim(doc_type)) = lower(trim($3))
            AND approval_status = 'Approved' AND id != $4
          ORDER BY id LIMIT 1`,
        [scopedOfficeId, entityId, existing.doc_type, id],
      );
      if (duplicate) {
        const entityLabel = existing.student_no ? "student" : "organization";
        const error = new Error(
          `A '${existing.doc_type}' record is already approved for this ${entityLabel} (record #${duplicate.id}). Decline this duplicate or return the approved record to Pending before approving a replacement.`,
        );
        error.code = "DUPLICATE_DOCUMENT";
        error.isDuplicate = true;
        error.duplicateId = duplicate.id;
        error.existingStatus = duplicate.approval_status;
        throw error;
      }
    }

    return await queryOne(
      `UPDATE documents
          SET approval_status = $1, reviewed_by = $2,
              reviewed_at = CURRENT_TIMESTAMP, review_note = $3
        WHERE id = $4 AND office_id = $5 RETURNING id`,
      [approvalStatus, reviewedBy || null, reviewNote || null, id, scopedOfficeId],
    );
  });
  if (!reviewed) return null;

  const updated = await getDocumentById(id, { officeId: scopedOfficeId });
  if (updated && ["Approved", "Declined"].includes(approvalStatus)) {
    try {
      let reviewerDisplayName = "Admin";
      if (reviewedBy) {
        const { getStaffById, getStaffFullName } = await import("./staffRepo.js");
        const staffMember = await getStaffById(reviewedBy);
        if (staffMember) {
          reviewerDisplayName = getStaffFullName(staffMember) || reviewedBy;
        } else {
          reviewerDisplayName = reviewedBy;
        }
      }
      const { createNotification } = await import("./notificationsRepo.js");
      await createNotification({
        officeId: scopedOfficeId,
        type: "document_review",
        title: approvalStatus === "Approved" ? `Document Approved: ${updated.doc_type}` : `Document Declined: ${updated.doc_type}`,
        message: approvalStatus === "Approved"
          ? `${reviewerDisplayName} approved ${updated.doc_type} for student ${updated.student_name || updated.student_no} (${updated.student_no})`
          : `${reviewerDisplayName} declined ${updated.doc_type} for student ${updated.student_name || updated.student_no} (${updated.student_no})${reviewNote ? ': "' + reviewNote + '"' : ""}`,
        severity: approvalStatus === "Approved" ? "success" : "error",
        actorName: reviewerDisplayName,
        actorId: reviewedBy || null,
        entityType: "document",
        entityId: id,
        metadata: {
          document_id: id,
          student_no: updated.student_no,
          student_name: updated.student_name,
          doc_type: updated.doc_type,
          original_filename: updated.original_filename,
          approval_status: approvalStatus,
          reviewed_by: reviewedBy,
          reviewer_name: reviewerDisplayName,
          reviewed_at: updated.reviewed_at,
          review_note: reviewNote,
          is_previewed: updated.is_previewed,
          mime_type: updated.mime_type,
        },
      });
    } catch (e) {
      console.error("Failed to create document_review notification:", e);
    }
  }

  return updated;
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

  const updated = await getDocumentById(id, { officeId: scopedOfficeId });
  if (updated) {
    try {
      let reviewerDisplayName = "Admin";
      if (reviewedBy) {
        const { getStaffById, getStaffFullName } = await import("./staffRepo.js");
        const staffMember = await getStaffById(reviewedBy);
        if (staffMember) {
          reviewerDisplayName = getStaffFullName(staffMember) || reviewedBy;
        } else {
          reviewerDisplayName = reviewedBy;
        }
      }
      const { createNotification } = await import("./notificationsRepo.js");
      await createNotification({
        officeId: scopedOfficeId,
        type: "document_review",
        title: `Document Declined: ${updated.doc_type}`,
        message: `${reviewerDisplayName} declined ${updated.doc_type} for student ${updated.student_name || updated.student_no} (${updated.student_no})${reviewNote ? ': "' + reviewNote + '"' : ""}`,
        severity: "error",
        actorName: reviewerDisplayName,
        actorId: reviewedBy || null,
        entityType: "document",
        entityId: id,
        metadata: {
          document_id: id,
          student_no: updated.student_no,
          student_name: updated.student_name,
          doc_type: updated.doc_type,
          original_filename: updated.original_filename,
          approval_status: "Declined",
          reviewed_by: reviewedBy,
          reviewer_name: reviewerDisplayName,
          reviewed_at: updated.reviewed_at,
          review_note: reviewNote,
          is_previewed: updated.is_previewed,
          mime_type: updated.mime_type,
        },
      });
    } catch (e) {
      console.error("Failed to create document_review notification:", e);
    }
  }

  return updated;
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

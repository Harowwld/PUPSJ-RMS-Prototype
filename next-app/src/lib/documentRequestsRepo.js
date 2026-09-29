import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import { canTransitionRequestStatus, DEFAULT_REQUEST_STATUS_MESSAGES } from "./constants.js";
import { decryptPII } from "./piiEncryption.js";

const VALID_STATUSES = new Set([
  "Pending",
  "InProgress",
  "Ready",
  "Completed",
  "Cancelled",
  "Shredded",
]);

export function isValidRequestStatus(s) {
  return VALID_STATUSES.has(String(s || ""));
}

export function decryptField(val) {
  if (!val || typeof val !== "string") return val;
  if (!val.includes("enc:v1:")) return val;
  if (val.startsWith("enc:v1:") && !val.includes(" ")) {
    return decryptPII(val);
  }
  return val
    .split(/\s+/)
    .map((part) => (part.startsWith("enc:v1:") ? decryptPII(part) : part))
    .join(" ")
    .trim();
}

export function formatDocumentRequestRow(row) {
  if (!row) return row;
  const decRequesterName = decryptField(row.raw_requester_name ?? row.requester_name);
  const decStudentName = decryptField(row.s_name);
  const saFirst = decryptField(row.sa_first_name);
  const saMiddle = decryptField(row.sa_middle_name);
  const saLast = decryptField(row.sa_last_name);
  const saFullName = [saFirst, saMiddle, saLast].filter(Boolean).join(" ");
  const saEmail = decryptField(row.sa_email ?? row.requester_email);

  const resolvedName = decRequesterName || decStudentName || saFullName || saEmail || "Requester";
  const resolvedEmail = saEmail || null;

  return {
    ...row,
    requester_name: decRequesterName || resolvedName,
    student_name: resolvedName,
    requester_email: resolvedEmail,
    requester_contact: decryptField(row.requester_contact),
  };
}

export async function listDocumentRequests({
  q = "",
  status = "",
  studentNo = "",
  clientType = "",
  docType = "",
  officeId = "",
  limit = 50,
  offset = 0,
  sortBy = "created_at",
  sortOrder = "DESC",
} = {}) {
  const filters = [];
  const params = [];

  if (officeId) {
    filters.push("dr.office_id = ?");
    params.push(officeId);
  }
  if (status) {
    const list = Array.isArray(status) ? status : String(status).split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length === 1) {
      filters.push("dr.status = ?");
      params.push(list[0]);
    } else if (list.length > 1) {
      filters.push(`dr.status IN (${list.map(() => "?").join(", ")})`);
      params.push(...list);
    }
  }
  if (studentNo) {
    filters.push("dr.student_no = ?");
    params.push(studentNo);
  }
  if (clientType) {
    const list = Array.isArray(clientType) ? clientType : String(clientType).split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length === 1) {
      filters.push("dr.client_type = ?");
      params.push(list[0]);
    } else if (list.length > 1) {
      filters.push(`dr.client_type IN (${list.map(() => "?").join(", ")})`);
      params.push(...list);
    }
  }
  if (docType) {
    const list = Array.isArray(docType) ? docType : String(docType).split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length === 1) {
      filters.push("dr.doc_type = ?");
      params.push(list[0]);
    } else if (list.length > 1) {
      filters.push(`dr.doc_type IN (${list.map(() => "?").join(", ")})`);
      params.push(...list);
    }
  }
  if (q) {
    filters.push(
      "(dr.student_no LIKE ? OR dr.requester_name LIKE ? OR s.name LIKE ? OR dr.doc_type LIKE ? OR IFNULL(dr.notes,'') LIKE ? OR IFNULL(dr.course_code,'') LIKE ? OR IFNULL(c.name,'') LIKE ? OR IFNULL(sa.email,'') LIKE ? OR IFNULL(sa.first_name,'') LIKE ? OR IFNULL(sa.last_name,'') LIKE ?)"
    );
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like, like, like, like, like);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const off = Math.max(parseInt(offset, 10) || 0, 0);

  const validSortCols = {
    id: "dr.id",
    student: "COALESCE(dr.requester_name, s.name, sa.last_name, sa.first_name, sa.email)",
    doc_type: "dr.doc_type",
    status: "dr.status",
    created_at: "dr.created_at",
  };
  const sortCol = validSortCols[sortBy] || "dr.created_at";
  const order = String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

  const rows = await dbAll(
    `
    SELECT
      dr.*,
      dr.requester_name AS raw_requester_name,
      s.name AS s_name,
      sa.first_name AS sa_first_name,
      sa.middle_name AS sa_middle_name,
      sa.last_name AS sa_last_name,
      sa.email AS sa_email,
      COALESCE(dr.course_code, s.course_code) AS course_code,
      c.name AS course_name,
      s.storage_room AS room,
      s.storage_cabinet AS cabinet,
      s.storage_drawer AS drawer,
      (SELECT COUNT(*) FROM document_request_attachments dra WHERE dra.document_request_id = dr.id) AS attachment_count
    FROM document_requests dr
    LEFT JOIN students s ON s.student_no = dr.student_no
    LEFT JOIN student_accounts sa ON sa.id = dr.student_account_id
    LEFT JOIN courses c ON c.code = COALESCE(dr.course_code, s.course_code)
    ${where}
    ORDER BY ${sortCol} ${order}, dr.id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, lim, off]
  );

  return (rows || []).map(formatDocumentRequestRow);
}

export async function countDocumentRequests({
  q = "",
  status = "",
  studentNo = "",
  clientType = "",
  docType = "",
  officeId = "",
} = {}) {
  const filters = [];
  const params = [];

  if (officeId) {
    filters.push("dr.office_id = ?");
    params.push(officeId);
  }
  if (status) {
    const list = Array.isArray(status) ? status : String(status).split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length === 1) {
      filters.push("dr.status = ?");
      params.push(list[0]);
    } else if (list.length > 1) {
      filters.push(`dr.status IN (${list.map(() => "?").join(", ")})`);
      params.push(...list);
    }
  }
  if (studentNo) {
    filters.push("dr.student_no = ?");
    params.push(studentNo);
  }
  if (clientType) {
    const list = Array.isArray(clientType) ? clientType : String(clientType).split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length === 1) {
      filters.push("dr.client_type = ?");
      params.push(list[0]);
    } else if (list.length > 1) {
      filters.push(`dr.client_type IN (${list.map(() => "?").join(", ")})`);
      params.push(...list);
    }
  }
  if (docType) {
    const list = Array.isArray(docType) ? docType : String(docType).split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length === 1) {
      filters.push("dr.doc_type = ?");
      params.push(list[0]);
    } else if (list.length > 1) {
      filters.push(`dr.doc_type IN (${list.map(() => "?").join(", ")})`);
      params.push(...list);
    }
  }
  if (q) {
    filters.push(
      "(dr.student_no LIKE ? OR dr.requester_name LIKE ? OR s.name LIKE ? OR dr.doc_type LIKE ? OR IFNULL(dr.notes,'') LIKE ? OR IFNULL(dr.course_code,'') LIKE ? OR IFNULL(c.name,'') LIKE ? OR IFNULL(sa.email,'') LIKE ? OR IFNULL(sa.first_name,'') LIKE ? OR IFNULL(sa.last_name,'') LIKE ?)"
    );
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like, like, like, like, like);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const row = await dbGet(
    `
    SELECT COUNT(*) AS c
    FROM document_requests dr
    LEFT JOIN students s ON s.student_no = dr.student_no
    LEFT JOIN student_accounts sa ON sa.id = dr.student_account_id
    LEFT JOIN courses c ON c.code = COALESCE(dr.course_code, s.course_code)
    ${where}
    `,
    params
  );
  return Number(row?.c) || 0;
}

export async function getDocumentRequestById(id, { officeId } = {}) {
  const filters = ["dr.id = ?"];
  const params = [id];
  if (officeId) {
    filters.push("dr.office_id = ?");
    params.push(officeId);
  }
  const rawRow = await dbGet(
    `
    SELECT
      dr.*,
      dr.requester_name AS raw_requester_name,
      s.name AS s_name,
      sa.first_name AS sa_first_name,
      sa.middle_name AS sa_middle_name,
      sa.last_name AS sa_last_name,
      sa.email AS sa_email,
      COALESCE(dr.course_code, s.course_code) AS course_code,
      c.name AS course_name,
      s.storage_room AS room,
      s.storage_cabinet AS cabinet,
      s.storage_drawer AS drawer
    FROM document_requests dr
    LEFT JOIN students s ON s.student_no = dr.student_no
    LEFT JOIN student_accounts sa ON sa.id = dr.student_account_id
    LEFT JOIN courses c ON c.code = COALESCE(dr.course_code, s.course_code)
    WHERE ${filters.join(" AND ")}
    `,
    params
  );
  if (!rawRow) return null;

  const row = formatDocumentRequestRow(rawRow);

  const updates = await dbAll(
    "SELECT * FROM transaction_updates WHERE document_request_id = ? ORDER BY created_at ASC",
    [id]
  );
  row.updates = updates || [];

  const attachments = await dbAll(
    "SELECT * FROM document_request_attachments WHERE document_request_id = ? ORDER BY created_at ASC",
    [id]
  );
  row.attachments = attachments || [];

  return row;
}

export async function createDocumentRequest({
  officeId,
  studentNo,
  docType,
  notes = null,
  createdBy = null,
  linkedDocumentId = null,
  clientType = "Student",
  courseCode = null,
  requesterName = null,
  studentAccountId = null,
  requesterRelationship = null,
  requesterContact = null,
}) {
  const sn = String(studentNo || "").trim().toUpperCase() || null;
  const dt = String(docType || "").trim();
  const ct = String(clientType || "Student").trim();
  const cc = String(courseCode || "").trim().toUpperCase() || null;
  const rn = requesterName ? decryptField(String(requesterName).trim()) || null : null;
  const rr = requesterRelationship ? decryptField(String(requesterRelationship).trim()) || null : null;
  const rc = requesterContact ? decryptField(String(requesterContact).trim()) || null : null;
  if (!dt) return null;
  if (ct === "Student" && !sn) return null;

  const lid =
    linkedDocumentId != null && Number.isFinite(Number(linkedDocumentId))
      ? Number(linkedDocumentId)
      : null;

  const res = await dbRun(
    `
    INSERT INTO document_requests (
      office_id, student_no, doc_type, status, notes, linked_document_id, client_type, course_code, requester_name, requester_relationship, requester_contact, student_account_id, created_by, updated_by
    ) VALUES (?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [officeId, sn, dt, notes ?? null, lid, ct, cc, rn, rr, rc, studentAccountId || null, createdBy ?? null, createdBy ?? null]
  );
  const id = res.lastInsertRowid;
  if (!id) return null;

  await dbRun(
    `
    INSERT INTO transaction_updates (document_request_id, status, message, created_by)
    VALUES (?, 'Pending', 'Request initiated by Registrar Staff.', ?)
    `,
    [id, createdBy ?? null]
  );

  return await getDocumentRequestById(id);
}

export async function updateDocumentRequest(id, fields) {
  const scope = fields.officeId ? " AND office_id = ?" : "";
  const existing = await dbGet(
    `SELECT id, office_id, status, notes FROM document_requests WHERE id = ?${scope}`,
    fields.officeId ? [id, fields.officeId] : [id]
  );
  if (!existing) return null;

  const cols = [];
  const vals = [];

  let statusChanged = false;
  let nextStatus = existing.status;

  if (fields.status !== undefined) {
    const s = String(fields.status || "");
    if (!isValidRequestStatus(s)) return null;
    if (existing.status && existing.status !== s && !canTransitionRequestStatus(existing.status, s)) {
      throw new Error(`Cannot transition document request from status "${existing.status}" to "${s}". Terminal and progressed requests cannot be reverted.`);
    }
    if (existing.status !== s) {
      statusChanged = true;
      nextStatus = s;
    }
    cols.push("status = ?");
    vals.push(s);
  }
  if (fields.notes !== undefined) {
    cols.push("notes = ?");
    vals.push(fields.notes);
  }
  if (fields.courseCode !== undefined) {
    cols.push("course_code = ?");
    vals.push(fields.courseCode ? String(fields.courseCode).trim().toUpperCase() : null);
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
  if (fields.spaVerified !== undefined) {
    const isVerified = Boolean(fields.spaVerified);
    cols.push("spa_verified = ?");
    vals.push(isVerified);
    if (isVerified) {
      cols.push("spa_verified_by = ?");
      vals.push(fields.spaVerifiedBy || fields.updatedBy || null);
      cols.push("spa_verified_at = datetime('now')");
    } else {
      cols.push("spa_verified_by = ?");
      vals.push(null);
      cols.push("spa_verified_at = ?");
      vals.push(null);
    }
  }

  if (cols.length > 0) {
    vals.push(id);
    await dbRun(
      `UPDATE document_requests SET ${cols.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
      vals
    );
  }

  const rawMessage = fields.message !== undefined && fields.message !== null ? String(fields.message).trim() : "";

  // Timeline update handling & deduplication:
  if (statusChanged) {
    // When status changes, ALWAYS guarantee a timeline entry is recorded
    const finalMessage = rawMessage || DEFAULT_REQUEST_STATUS_MESSAGES[nextStatus] || `Status updated to ${nextStatus}.`;

    // Deduplication check against rapid duplicate/double-click submissions
    const latestUpdate = await dbGet(
      `SELECT status, message FROM transaction_updates WHERE document_request_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
      [id]
    );

    const isDuplicate = latestUpdate && latestUpdate.status === nextStatus && latestUpdate.message === finalMessage;
    if (!isDuplicate) {
      await dbRun(
        `INSERT INTO transaction_updates (document_request_id, status, message, created_by)
         VALUES (?, ?, ?, ?)`,
        [id, nextStatus, finalMessage, fields.updatedBy ?? null]
      );
    }
  } else if (rawMessage) {
    // Status did NOT change, but caller provided a message/note.
    // Check if the latest update already has the identical status and message.
    const latestUpdate = await dbGet(
      `SELECT status, message FROM transaction_updates WHERE document_request_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
      [id]
    );

    const isDuplicate = latestUpdate && latestUpdate.status === nextStatus && latestUpdate.message === rawMessage;
    if (!isDuplicate) {
      await dbRun(
        `INSERT INTO transaction_updates (document_request_id, status, message, created_by)
         VALUES (?, ?, ?, ?)`,
        [id, nextStatus, rawMessage, fields.updatedBy ?? null]
      );
    }
  }

  return await getDocumentRequestById(id, fields.officeId ? { officeId: fields.officeId } : {});
}

export async function addRequestAttachment({
  documentRequestId,
  originalFilename,
  storageFilename,
  mimeType,
  sizeBytes,
  attachmentType = "evidence",
  uploadedBy = null,
}) {
  const res = await dbRun(
    `INSERT INTO document_request_attachments (
       document_request_id, original_filename, storage_filename, mime_type, size_bytes, attachment_type, uploaded_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      documentRequestId,
      originalFilename,
      storageFilename,
      mimeType,
      sizeBytes,
      attachmentType || "evidence",
      uploadedBy || null,
    ]
  );
  const id = res.lastInsertRowid;
  return await getRequestAttachmentById(id);
}

export async function getRequestAttachments(documentRequestId) {
  return await dbAll(
    `SELECT * FROM document_request_attachments WHERE document_request_id = ? ORDER BY created_at ASC`,
    [documentRequestId]
  );
}

export async function getRequestAttachmentById(id) {
  return await dbGet(
    `SELECT * FROM document_request_attachments WHERE id = ?`,
    [id]
  );
}

export async function updateSpaVerification(id, { verified, staffId = null } = {}) {
  return await updateDocumentRequest(id, {
    spaVerified: Boolean(verified),
    spaVerifiedBy: staffId,
    updatedBy: staffId,
    message: verified
      ? "Special Power of Attorney (SPA) and authorization documents verified by Registrar Staff."
      : "Special Power of Attorney (SPA) verification status revoked.",
  });
}

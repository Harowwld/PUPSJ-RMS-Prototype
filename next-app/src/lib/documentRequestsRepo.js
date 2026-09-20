import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import { canTransitionRequestStatus } from "./constants.js";

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

  return await dbAll(
    `
    SELECT
      dr.*,
      COALESCE(dr.requester_name, s.name, NULLIF(TRIM(CONCAT_WS(' ', sa.first_name, sa.last_name)), ''), sa.email, 'Requester') AS student_name,
      COALESCE(dr.course_code, s.course_code) AS course_code,
      c.name AS course_name,
      sa.email AS requester_email,
      s.storage_room AS room,
      s.storage_cabinet AS cabinet,
      s.storage_drawer AS drawer
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
  const row = await dbGet(
    `
    SELECT
      dr.*,
      COALESCE(dr.requester_name, s.name, NULLIF(TRIM(CONCAT_WS(' ', sa.first_name, sa.last_name)), ''), sa.email, 'Requester') AS student_name,
      COALESCE(dr.course_code, s.course_code) AS course_code,
      c.name AS course_name,
      sa.email AS requester_email,
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
  if (!row) return null;

  const updates = await dbAll(
    "SELECT * FROM transaction_updates WHERE document_request_id = ? ORDER BY created_at ASC",
    [id]
  );
  row.updates = updates || [];

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
}) {
  const sn = String(studentNo || "").trim().toUpperCase() || null;
  const dt = String(docType || "").trim();
  const ct = String(clientType || "Student").trim();
  const cc = String(courseCode || "").trim().toUpperCase() || null;
  const rn = String(requesterName || "").trim() || null;
  if (!dt) return null;
  if (ct === "Student" && !sn) return null;

  const lid =
    linkedDocumentId != null && Number.isFinite(Number(linkedDocumentId))
      ? Number(linkedDocumentId)
      : null;

  const res = await dbRun(
    `
    INSERT INTO document_requests (
      office_id, student_no, doc_type, status, notes, linked_document_id, client_type, course_code, requester_name, student_account_id, created_by, updated_by
    ) VALUES (?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [officeId, sn, dt, notes ?? null, lid, ct, cc, rn, studentAccountId || null, createdBy ?? null, createdBy ?? null]
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

  if (fields.status !== undefined) {
    const s = String(fields.status || "");
    if (!isValidRequestStatus(s)) return null;
    if (existing.status && existing.status !== s && !canTransitionRequestStatus(existing.status, s)) {
      throw new Error(`Cannot transition document request from status "${existing.status}" to "${s}". Terminal and progressed requests cannot be reverted.`);
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

  if (cols.length > 0) {
    vals.push(id);
    await dbRun(
      `UPDATE document_requests SET ${cols.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
      vals
    );
  }

  if (fields.message && String(fields.message).trim()) {
    const currentStatus = fields.status || existing.status || "Pending";
    await dbRun(
      `INSERT INTO transaction_updates (document_request_id, status, message, created_by)
       VALUES (?, ?, ?, ?)`,
      [id, currentStatus, String(fields.message).trim(), fields.updatedBy ?? null]
    );
  }

  return await getDocumentRequestById(id);
  return await getDocumentRequestById(id, { officeId: fields.officeId });
}

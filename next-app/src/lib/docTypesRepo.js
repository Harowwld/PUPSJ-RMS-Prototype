import { dbAll, dbGet, dbRun } from "./postgresCompat.js";

function requireOfficeId(officeId) {
  const value = String(officeId || "").trim().toLowerCase();
  if (!value) throw new Error("Office scope is required");
  return value;
}

function normalizeDocTypeKey(nameRaw) {
  return String(nameRaw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function listDocTypes({ includeArchived = false, officeId, scope } = {}) {
  const scopedOfficeId = requireOfficeId(officeId);
  const statusFilter = includeArchived ? "" : " AND status = 'Active'";
  let scopeFilter = "";
  if (scope === "requestable") {
    scopeFilter = " AND is_requestable = TRUE AND is_compliance = FALSE";
  } else if (scope === "compliance") {
    scopeFilter = " AND is_compliance = TRUE";
  }

  const rows = await dbAll(
    `SELECT name FROM document_types
     WHERE office_id = ?${statusFilter}${scopeFilter}
     ORDER BY lower(name) ASC`,
    [scopedOfficeId]
  );
  return (rows || []).map((r) => String(r?.name || ""));
}

export async function listAllDocTypes({ includeArchived = false, officeId, scope } = {}) {
  const scopedOfficeId = requireOfficeId(officeId);
  const statusFilter = includeArchived ? "" : " AND status = 'Active'";
  let scopeFilter = "";
  if (scope === "requestable") {
    scopeFilter = " AND is_requestable = TRUE AND is_compliance = FALSE";
  } else if (scope === "compliance") {
    scopeFilter = " AND is_compliance = TRUE";
  }

  return await dbAll(
    `SELECT id, office_id, name, name_norm, status, is_requestable, is_compliance, compliance_category, created_at
     FROM document_types
     WHERE office_id = ?${statusFilter}${scopeFilter}
     ORDER BY lower(name) ASC`,
    [scopedOfficeId]
  ) || [];
}

export async function createDocTypeFull(nameRaw, officeId, { isRequestable = false, isCompliance = false, complianceCategory = "General Requirements", upsert = false } = {}) {
  const scopedOfficeId = requireOfficeId(officeId);
  const name = String(nameRaw || "").trim();
  if (!name) throw new Error("Missing name");

  const nameNorm = normalizeDocTypeKey(name);
  
  // 1. Strict existence check / upsert
  const existing = await dbGet("SELECT id FROM document_types WHERE office_id = ? AND name_norm = ?", [scopedOfficeId, nameNorm]);
  if (existing) {
    if (upsert) {
      await dbRun(
        `UPDATE document_types
         SET name = ?, status = 'Active', is_requestable = ?, is_compliance = ?, compliance_category = ?
         WHERE office_id = ? AND id = ?`,
        [
          name,
          Boolean(isRequestable),
          Boolean(isCompliance),
          String(complianceCategory || "General Requirements").trim(),
          scopedOfficeId,
          existing.id,
        ]
      );
      return await dbGet("SELECT * FROM document_types WHERE office_id = ? AND id = ?", [scopedOfficeId, existing.id]);
    }
    throw new Error("Document type already exists");
  }

  // 2. Perform insertion
  const res = await dbRun(
    `INSERT INTO document_types (office_id, name, name_norm, status, is_requestable, is_compliance, compliance_category)
     VALUES (?, ?, ?, 'Active', ?, ?, ?)`,
    [
      scopedOfficeId,
      name,
      nameNorm,
      Boolean(isRequestable),
      Boolean(isCompliance),
      String(complianceCategory || "General Requirements").trim(),
    ]
  );
  
  if (!res || res.lastInsertRowid === null || res.lastInsertRowid === undefined) {
    throw new Error("Failed to insert document type: No ID returned from database");
  }

  // 3. Retrieve the created object with fallback
  const created = await dbGet("SELECT * FROM document_types WHERE office_id = ? AND id = ?", [scopedOfficeId, res.lastInsertRowid]);
  
  if (!created) {
    return {
      id: res.lastInsertRowid,
      office_id: scopedOfficeId,
      name,
      name_norm: nameNorm,
      status: "Active",
      is_requestable: Boolean(isRequestable),
      is_compliance: Boolean(isCompliance),
      compliance_category: complianceCategory,
    };
  }
  
  return created;
}

export async function updateDocType(id, nameRaw, status, officeId, { isRequestable, isCompliance, complianceCategory } = {}) {
  const scopedOfficeId = requireOfficeId(officeId);
  const name = String(nameRaw || "").trim();
  if (!name) throw new Error("Missing name");

  const nameNorm = normalizeDocTypeKey(name);
  const existing = await dbGet("SELECT id FROM document_types WHERE office_id = ? AND name_norm = ? AND id != ?", [scopedOfficeId, nameNorm, id]);
  if (existing) throw new Error("Document type already exists");

  const current = await dbGet("SELECT * FROM document_types WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
  if (!current) throw new Error("Document type not found");

  const effectiveIsRequestable = isRequestable !== undefined ? Boolean(isRequestable) : Boolean(current.is_requestable);
  const effectiveIsCompliance = isCompliance !== undefined ? Boolean(isCompliance) : Boolean(current.is_compliance);
  const effectiveCategory = complianceCategory !== undefined ? String(complianceCategory).trim() : (current.compliance_category || "General Requirements");
  const effectiveStatus = status !== undefined ? status : current.status;

  await dbRun(
    `UPDATE document_types
     SET name = ?, name_norm = ?, status = ?, is_requestable = ?, is_compliance = ?, compliance_category = ?
     WHERE office_id = ? AND id = ?`,
    [
      name,
      nameNorm,
      effectiveStatus,
      effectiveIsRequestable,
      effectiveIsCompliance,
      effectiveCategory,
      scopedOfficeId,
      id
    ]
  );
  return await dbGet("SELECT * FROM document_types WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
}

export async function archiveDocType(id, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  await dbRun("UPDATE document_types SET status = 'Archived' WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
  return true;
}

export async function restoreDocType(id, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  await dbRun("UPDATE document_types SET status = 'Active' WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
  return true;
}

export async function deleteDocType(id, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  await dbRun("DELETE FROM document_types WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
  return true;
}

export async function createDocType(nameRaw, officeId, options) {
  return await createDocTypeFull(nameRaw, officeId, options);
}

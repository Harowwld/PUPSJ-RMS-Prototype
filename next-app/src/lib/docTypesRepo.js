import { dbAll, dbGet, dbRun } from "./sqlite";

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

export async function listDocTypes({ includeArchived = false, officeId } = {}) {
  const scopedOfficeId = requireOfficeId(officeId);
  const statusFilter = includeArchived ? "" : " AND status = 'Active'";
  const rows = await dbAll(
    `SELECT name FROM document_types
     WHERE office_id = ?${statusFilter}
     ORDER BY lower(name) ASC`,
    [scopedOfficeId]
  );
  return (rows || []).map((r) => String(r?.name || ""));
}

export async function listAllDocTypes({ includeArchived = false, officeId } = {}) {
  const scopedOfficeId = requireOfficeId(officeId);
  const statusFilter = includeArchived ? "" : " AND status = 'Active'";
  return await dbAll(`SELECT id, office_id, name, name_norm, status, created_at FROM document_types WHERE office_id = ?${statusFilter} ORDER BY lower(name) ASC`, [scopedOfficeId]) || [];
}

export async function createDocTypeFull(nameRaw, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  const name = String(nameRaw || "").trim();
  if (!name) throw new Error("Missing name");

  const nameNorm = normalizeDocTypeKey(name);
  
  // 1. Strict existence check
  const existing = await dbGet("SELECT id FROM document_types WHERE office_id = ? AND name_norm = ?", [scopedOfficeId, nameNorm]);
  if (existing) throw new Error("Document type already exists");

  // 2. Perform insertion
  const res = await dbRun("INSERT INTO document_types (office_id, name, name_norm, status) VALUES (?, ?, ?, 'Active')", [
    scopedOfficeId,
    name,
    nameNorm,
  ]);
  
  if (!res || res.lastInsertRowid === null || res.lastInsertRowid === undefined) {
    throw new Error("Failed to insert document type: No ID returned from database");
  }

  // 3. Retrieve the created object with fallback
  const created = await dbGet("SELECT * FROM document_types WHERE office_id = ? AND id = ?", [scopedOfficeId, res.lastInsertRowid]);
  
  if (!created) {
    // If retrieval fails but insert succeeded, return a synthetic object so logging doesn't crash
    return {
      id: res.lastInsertRowid,
      office_id: scopedOfficeId,
      name,
      name_norm: nameNorm,
      status: "Active"
    };
  }
  
  return created;
}

export async function updateDocType(id, nameRaw, status = "Active", officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  const name = String(nameRaw || "").trim();
  if (!name) throw new Error("Missing name");

  const nameNorm = normalizeDocTypeKey(name);
  const existing = await dbGet("SELECT id FROM document_types WHERE office_id = ? AND name_norm = ? AND id != ?", [scopedOfficeId, nameNorm, id]);
  if (existing) throw new Error("Document type already exists");

  await dbRun("UPDATE document_types SET name = ?, name_norm = ?, status = ? WHERE office_id = ? AND id = ?", [
    name,
    nameNorm,
    status,
    scopedOfficeId,
    id
  ]);
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

export async function createDocType(nameRaw, officeId) {
  return await createDocTypeFull(nameRaw, officeId);
}

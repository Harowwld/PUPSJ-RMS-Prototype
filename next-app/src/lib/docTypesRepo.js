import { dbAll, dbGet, dbRun } from "./sqlite";

function normalizeDocTypeKey(nameRaw) {
  return String(nameRaw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function listDocTypes({ includeArchived = false } = {}) {
  const where = includeArchived ? "" : "WHERE status = 'Active'";
  const rows = await dbAll(
    `SELECT name FROM document_types ${where} ORDER BY name COLLATE NOCASE ASC`,
    []
  );
  return (rows || []).map((r) => String(r?.name || ""));
}

export async function listAllDocTypes({ includeArchived = false } = {}) {
  const where = includeArchived ? "" : "WHERE status = 'Active'";
  return await dbAll(`SELECT id, name, name_norm, status, created_at FROM document_types ${where} ORDER BY name COLLATE NOCASE ASC`, []) || [];
}

export async function createDocTypeFull(nameRaw) {
  const name = String(nameRaw || "").trim();
  if (!name) throw new Error("Missing name");

  const nameNorm = normalizeDocTypeKey(name);
  
  // 1. Strict existence check
  const existing = await dbGet("SELECT id FROM document_types WHERE name_norm = ?", [nameNorm]);
  if (existing) throw new Error("Document type already exists");

  // 2. Perform insertion
  const res = await dbRun("INSERT INTO document_types (name, name_norm, status) VALUES (?, ?, 'Active')", [
    name,
    nameNorm,
  ]);
  
  if (!res || res.lastInsertRowid === null || res.lastInsertRowid === undefined) {
    throw new Error("Failed to insert document type: No ID returned from database");
  }

  // 3. Retrieve the created object with fallback
  const created = await dbGet("SELECT * FROM document_types WHERE id = ?", [res.lastInsertRowid]);
  
  if (!created) {
    // If retrieval fails but insert succeeded, return a synthetic object so logging doesn't crash
    return {
      id: res.lastInsertRowid,
      name,
      name_norm: nameNorm,
      status: "Active"
    };
  }
  
  return created;
}

export async function updateDocType(id, nameRaw, status = "Active") {
  const name = String(nameRaw || "").trim();
  if (!name) throw new Error("Missing name");

  const nameNorm = normalizeDocTypeKey(name);
  const existing = await dbGet("SELECT id FROM document_types WHERE name_norm = ? AND id != ?", [nameNorm, id]);
  if (existing) throw new Error("Document type already exists");

  await dbRun("UPDATE document_types SET name = ?, name_norm = ?, status = ? WHERE id = ?", [
    name,
    nameNorm,
    status,
    id
  ]);
  return await dbGet("SELECT * FROM document_types WHERE id = ?", [id]);
}

export async function archiveDocType(id) {
  await dbRun("UPDATE document_types SET status = 'Archived' WHERE id = ?", [id]);
  return true;
}

export async function restoreDocType(id) {
  await dbRun("UPDATE document_types SET status = 'Active' WHERE id = ?", [id]);
  return true;
}

export async function deleteDocType(id) {
  await dbRun("DELETE FROM document_types WHERE id = ?", [id]);
  return true;
}

export async function createDocType(nameRaw) {
  return await createDocTypeFull(nameRaw);
}

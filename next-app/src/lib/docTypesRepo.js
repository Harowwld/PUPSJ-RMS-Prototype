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
  return rows.map((r) => String(r.name));
}

export async function listAllDocTypes({ includeArchived = false } = {}) {
  const where = includeArchived ? "" : "WHERE status = 'Active'";
  return await dbAll(`SELECT id, name, name_norm, status, created_at FROM document_types ${where} ORDER BY name COLLATE NOCASE ASC`, []);
}

export async function createDocTypeFull(nameRaw) {
  const name = String(nameRaw || "").trim();
  if (!name) throw new Error("Missing name");

  const nameNorm = normalizeDocTypeKey(name);
  const existing = await dbGet("SELECT id FROM document_types WHERE name_norm = ?", [nameNorm]);
  if (existing) throw new Error("Document type already exists");

  const res = await dbRun("INSERT INTO document_types (name, name_norm, status) VALUES (?, ?, 'Active')", [
    name,
    nameNorm,
  ]);
  return await dbGet("SELECT * FROM document_types WHERE id = ?", [res.lastInsertRowid]);
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
  const name = String(nameRaw || "").trim();
  if (!name) throw new Error("Missing name");

  const nameNorm = normalizeDocTypeKey(name);
  const existing = await dbGet(
    "SELECT name FROM document_types WHERE name_norm = ?",
    [nameNorm]
  );
  if (existing?.name) return String(existing.name);

  await dbRun("INSERT INTO document_types (name, name_norm) VALUES (?, ?)", [
    name,
    nameNorm,
  ]);
  const row = await dbGet("SELECT name FROM document_types WHERE name_norm = ?", [nameNorm]);
  return row?.name ? String(row.name) : name;
}

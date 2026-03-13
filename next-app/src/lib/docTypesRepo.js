import { dbAll, dbGet, dbRun } from "./sqlite";

function normalizeDocTypeKey(nameRaw) {
  return String(nameRaw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function listDocTypes() {
  const rows = await dbAll(
    "SELECT name FROM document_types ORDER BY name COLLATE NOCASE ASC",
    []
  );
  return rows.map((r) => String(r.name));
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

import { dbAll, dbGet, dbRun } from "./sqlite";

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

  await dbRun("INSERT INTO document_types (name) VALUES (?)", [name]);
  const row = await dbGet("SELECT name FROM document_types WHERE name = ?", [name]);
  return row?.name ? String(row.name) : name;
}

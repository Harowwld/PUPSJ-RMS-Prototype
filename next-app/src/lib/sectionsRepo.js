import { dbAll, dbGet, dbRun } from "./sqlite";

export async function listSections() {
  const rows = await dbAll(
    "SELECT id, name, created_at FROM sections ORDER BY name ASC",
    []
  );
  return rows;
}

export async function createSection(nameRaw) {
  const name = String(nameRaw || "").trim();

  if (!name) throw new Error("Missing section name");

  const existing = await dbGet("SELECT id FROM sections WHERE name = ?", [name]);
  if (existing) throw new Error("Section name already exists");

  const res = await dbRun("INSERT INTO sections (name) VALUES (?)", [
    name,
  ]);
  
  return await dbGet("SELECT * FROM sections WHERE id = ?", [res.lastInsertRowid]);
}

export async function updateSection(id, nameRaw) {
  const name = String(nameRaw || "").trim();

  if (!name) throw new Error("Missing section name");

  const existing = await dbGet("SELECT id FROM sections WHERE name = ? AND id != ?", [name, id]);
  if (existing) throw new Error("Section name already exists");

  await dbRun("UPDATE sections SET name = ? WHERE id = ?", [
    name,
    id
  ]);

  return await dbGet("SELECT * FROM sections WHERE id = ?", [id]);
}

export async function deleteSection(id) {
  await dbRun("DELETE FROM sections WHERE id = ?", [id]);
  return true;
}

import { dbAll, dbGet, dbRun } from "./sqlite";

export async function listCourses() {
  const rows = await dbAll(
    "SELECT id, code, name, created_at FROM courses ORDER BY code ASC",
    []
  );
  return rows;
}

export async function createCourse(codeRaw, nameRaw) {
  const code = String(codeRaw || "").trim().toUpperCase();
  const name = String(nameRaw || "").trim();

  if (!code || !name) throw new Error("Missing code or name");

  const existing = await dbGet("SELECT id FROM courses WHERE code = ?", [code]);
  if (existing) throw new Error("Course code already exists");

  const res = await dbRun("INSERT INTO courses (code, name) VALUES (?, ?)", [
    code,
    name,
  ]);
  
  return await dbGet("SELECT * FROM courses WHERE id = ?", [res.lastInsertRowid]);
}

export async function updateCourse(id, codeRaw, nameRaw) {
  const code = String(codeRaw || "").trim().toUpperCase();
  const name = String(nameRaw || "").trim();

  if (!code || !name) throw new Error("Missing code or name");

  const existing = await dbGet("SELECT id FROM courses WHERE code = ? AND id != ?", [code, id]);
  if (existing) throw new Error("Course code already exists");

  await dbRun("UPDATE courses SET code = ?, name = ? WHERE id = ?", [
    code,
    name,
    id
  ]);

  return await dbGet("SELECT * FROM courses WHERE id = ?", [id]);
}

export async function deleteCourse(id) {
  await dbRun("DELETE FROM courses WHERE id = ?", [id]);
  return true;
}

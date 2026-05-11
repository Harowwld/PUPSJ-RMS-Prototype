import { dbAll, dbGet, dbRun } from "./sqlite";

export async function listCourses({ includeArchived = false } = {}) {
  const where = includeArchived ? "" : "WHERE status = 'Active'";
  const rows = await dbAll(
    `SELECT id, code, name, status, created_at FROM courses ${where} ORDER BY code ASC`,
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

  const res = await dbRun("INSERT INTO courses (code, name, status) VALUES (?, ?, 'Active')", [
    code,
    name,
  ]);

  return await dbGet("SELECT * FROM courses WHERE id = ?", [res.lastInsertRowid]);
}

export async function updateCourse(id, codeRaw, nameRaw, status = "Active") {
  const code = String(codeRaw || "").trim().toUpperCase();
  const name = String(nameRaw || "").trim();

  if (!code || !name) throw new Error("Missing code or name");

  const existing = await dbGet("SELECT id FROM courses WHERE code = ? AND id != ?", [code, id]);
  if (existing) throw new Error("Course code already exists");

  await dbRun("UPDATE courses SET code = ?, name = ?, status = ? WHERE id = ?", [
    code,
    name,
    status,
    id
  ]);

  return await dbGet("SELECT * FROM courses WHERE id = ?", [id]);
}

export async function archiveCourse(id) {
  const course = await dbGet("SELECT code FROM courses WHERE id = ?", [id]);
  if (course?.code) {
    await dbRun("UPDATE sections SET status = 'Archived' WHERE course_code = ? AND status = 'Active'", [course.code]);
  }
  await dbRun("UPDATE courses SET status = 'Archived' WHERE id = ?", [id]);
  return true;
}

export async function restoreCourse(id) {
  await dbRun("UPDATE courses SET status = 'Active' WHERE id = ?", [id]);
  return true;
}

export async function deleteCourse(id) {
  // We keep this for hard deletes if ever needed, but internal logic should prefer archiving
  const course = await dbGet("SELECT code FROM courses WHERE id = ?", [id]);
  if (course?.code) {
    await dbRun("UPDATE sections SET course_code = NULL WHERE course_code = ?", [course.code]);
  }
  await dbRun("DELETE FROM courses WHERE id = ?", [id]);
  return true;
}

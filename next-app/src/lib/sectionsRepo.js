import { dbAll, dbGet, dbRun } from "./sqlite";

export async function listSections({ includeArchived = false } = {}) {
  const where = includeArchived ? "" : "s.status = 'Active'";
  const rows = await dbAll(
    `SELECT s.id, s.name, s.course_code, s.status, c.name as course_name, s.created_at
     FROM sections s
     LEFT JOIN courses c ON c.code = s.course_code
     ${where ? "WHERE " + where : ""}
     ORDER BY s.name ASC`,
    []
  );
  return rows;
}

export async function createSection(nameRaw, courseCodeRaw) {
  const name = String(nameRaw || "").trim();
  const courseCode = String(courseCodeRaw || "").trim().toUpperCase();

  if (!name) throw new Error("Missing section name");
  const safeCode = courseCode || "UNKN";

  const course = await dbGet("SELECT code FROM courses WHERE code = ?", [safeCode]);
  if (!course) {
    if (safeCode === "UNKN") {
       await dbRun("INSERT OR IGNORE INTO courses (code, name) VALUES ('UNKN', 'Unknown')");
    } else {
       throw new Error(`Course ${safeCode} not found`);
    }
  }

  const existing = await dbGet("SELECT id FROM sections WHERE name = ? AND COALESCE(course_code, 'UNKN') = ?", [name, safeCode]);
  if (existing) throw new Error("Section name already exists for this degree program");

  const res = await dbRun("INSERT INTO sections (name, course_code, status) VALUES (?, ?, 'Active')", [name, safeCode]);

  return await dbGet(
    `SELECT s.*, c.name as course_name
     FROM sections s
     LEFT JOIN courses c ON c.code = s.course_code
     WHERE s.id = ?`,
    [res.lastInsertRowid]
  );
}

export async function updateSection(id, nameRaw, courseCodeRaw, status = "Active") {
  const name = String(nameRaw || "").trim();
  const courseCode = String(courseCodeRaw || "").trim().toUpperCase();

  if (!name) throw new Error("Missing section name");
  const safeCode = courseCode || "UNKN";

  const course = await dbGet("SELECT code FROM courses WHERE code = ?", [safeCode]);
  if (!course) throw new Error(`Course ${safeCode} not found`);

  const existing = await dbGet("SELECT id FROM sections WHERE name = ? AND COALESCE(course_code, 'UNKN') = ? AND id != ?", [name, safeCode, id]);
  if (existing) throw new Error("Section name already exists for this degree program");

  await dbRun("UPDATE sections SET name = ?, course_code = ?, status = ? WHERE id = ?", [name, safeCode, status, id]);

  return await dbGet(
    `SELECT s.*, c.name as course_name
     FROM sections s
     LEFT JOIN courses c ON c.code = s.course_code
     WHERE s.id = ?`,
    [id]
  );
}

export async function archiveSection(id) {
  await dbRun("UPDATE sections SET status = 'Archived' WHERE id = ?", [id]);
  return true;
}

export async function restoreSection(id) {
  await dbRun("UPDATE sections SET status = 'Active' WHERE id = ?", [id]);
  return true;
}

export async function deleteSection(id) {
  await dbRun("DELETE FROM sections WHERE id = ?", [id]);
  return true;
}

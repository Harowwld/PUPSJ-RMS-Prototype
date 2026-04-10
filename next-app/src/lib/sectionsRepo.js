import { dbAll, dbGet, dbRun } from "./sqlite";

let courseCodeEnsured = false;

async function ensureSectionsCourseCodeColumn() {
  if (courseCodeEnsured) return;
  try {
    const cols = await dbAll("PRAGMA table_info(sections)");
    const names = new Set((cols || []).map((c) => String(c?.name || "")));
    if (!names.has("course_code")) {
      await dbRun("ALTER TABLE sections ADD COLUMN course_code TEXT");
    }
    await dbRun("CREATE INDEX IF NOT EXISTS idx_sections_course_code ON sections(course_code)");
  } catch {
    // ignore; fallback queries below will still work when possible
  } finally {
    courseCodeEnsured = true;
  }
}

export async function listSections() {
  await ensureSectionsCourseCodeColumn();
  const rows = await dbAll(
    `SELECT s.id, s.name, s.course_code, c.name as course_name, s.created_at
     FROM sections s
     LEFT JOIN courses c ON c.code = s.course_code
     ORDER BY s.name ASC`,
    []
  );
  return rows;
}

export async function createSection(nameRaw, courseCodeRaw) {
  await ensureSectionsCourseCodeColumn();
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

  const res = await dbRun("INSERT INTO sections (name, course_code) VALUES (?, ?)", [name, safeCode]);

  return await dbGet(
    `SELECT s.*, c.name as course_name
     FROM sections s
     LEFT JOIN courses c ON c.code = s.course_code
     WHERE s.id = ?`,
    [res.lastInsertRowid]
  );
}

export async function updateSection(id, nameRaw, courseCodeRaw) {
  await ensureSectionsCourseCodeColumn();
  const name = String(nameRaw || "").trim();
  const courseCode = String(courseCodeRaw || "").trim().toUpperCase();

  if (!name) throw new Error("Missing section name");
  const safeCode = courseCode || "UNKN";

  const course = await dbGet("SELECT code FROM courses WHERE code = ?", [safeCode]);
  if (!course) throw new Error(`Course ${safeCode} not found`);

  const existing = await dbGet("SELECT id FROM sections WHERE name = ? AND COALESCE(course_code, 'UNKN') = ? AND id != ?", [name, safeCode, id]);
  if (existing) throw new Error("Section name already exists for this degree program");

  await dbRun("UPDATE sections SET name = ?, course_code = ? WHERE id = ?", [name, safeCode, id]);

  return await dbGet(
    `SELECT s.*, c.name as course_name
     FROM sections s
     LEFT JOIN courses c ON c.code = s.course_code
     WHERE s.id = ?`,
    [id]
  );
}

export async function deleteSection(id) {
  await ensureSectionsCourseCodeColumn();
  await dbRun("DELETE FROM sections WHERE id = ?", [id]);
  return true;
}

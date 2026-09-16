import { dbAll, dbGet, dbRun } from "./sqlite";

function requireOfficeId(officeId) {
  const value = String(officeId || "").trim().toLowerCase();
  if (!value) throw new Error("Office scope is required");
  return value;
}

export async function listCourses({ includeArchived = false, officeId } = {}) {
  const scopedOfficeId = requireOfficeId(officeId);
  const statusFilter = includeArchived ? "" : " AND status = 'Active'";
  const rows = await dbAll(
    `SELECT id, office_id, code, name, status, created_at FROM courses
     WHERE office_id = ?${statusFilter}
     ORDER BY code ASC`,
    [scopedOfficeId]
  );
  return rows;
}

export async function createCourse(codeRaw, nameRaw, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  const code = String(codeRaw || "").trim().toUpperCase();
  const name = String(nameRaw || "").trim();

  if (!code || !name) throw new Error("Missing code or name");

  const existing = await dbGet("SELECT id FROM courses WHERE office_id = ? AND code = ?", [scopedOfficeId, code]);
  if (existing) throw new Error("Course code already exists");

  const res = await dbRun("INSERT INTO courses (office_id, code, name, status) VALUES (?, ?, ?, 'Active')", [
    scopedOfficeId,
    code,
    name,
  ]);

  return await dbGet("SELECT * FROM courses WHERE office_id = ? AND id = ?", [scopedOfficeId, res.lastInsertRowid]);
}

export async function updateCourse(id, codeRaw, nameRaw, status = "Active", officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  const code = String(codeRaw || "").trim().toUpperCase();
  const name = String(nameRaw || "").trim();

  if (!code || !name) throw new Error("Missing code or name");

  const existing = await dbGet("SELECT id FROM courses WHERE office_id = ? AND code = ? AND id != ?", [scopedOfficeId, code, id]);
  if (existing) throw new Error("Course code already exists");

  await dbRun("UPDATE courses SET code = ?, name = ?, status = ? WHERE office_id = ? AND id = ?", [
    code,
    name,
    status,
    scopedOfficeId,
    id
  ]);

  return await dbGet("SELECT * FROM courses WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
}

export async function archiveCourse(id, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  const course = await dbGet("SELECT code FROM courses WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
  if (course?.code) {
    await dbRun("UPDATE sections SET status = 'Archived' WHERE office_id = ? AND course_code = ? AND status = 'Active'", [scopedOfficeId, course.code]);
  }
  await dbRun("UPDATE courses SET status = 'Archived' WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
  return true;
}

export async function restoreCourse(id, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  await dbRun("UPDATE courses SET status = 'Active' WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
  return true;
}

export async function deleteCourse(id, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  // We keep this for hard deletes if ever needed, but internal logic should prefer archiving
  const course = await dbGet("SELECT code FROM courses WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
  if (course?.code) {
    await dbRun("UPDATE sections SET course_code = NULL WHERE office_id = ? AND course_code = ?", [scopedOfficeId, course.code]);
  }
  await dbRun("DELETE FROM courses WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
  return true;
}

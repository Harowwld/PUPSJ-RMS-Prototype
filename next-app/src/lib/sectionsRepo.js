import { dbAll, dbGet, dbRun } from "./sqlite";

function requireOfficeId(officeId) {
  const value = String(officeId || "").trim().toLowerCase();
  if (!value) throw new Error("Office scope is required");
  return value;
}

export async function listSections({ includeArchived = false, officeId } = {}) {
  const scopedOfficeId = requireOfficeId(officeId);
  const statusFilter = includeArchived ? "" : " AND s.status = 'Active'";
  const rows = await dbAll(
    `SELECT s.id, s.name, s.course_code, s.status, c.name as course_name, s.created_at
     FROM sections s
     LEFT JOIN courses c ON c.office_id = s.office_id AND c.code = s.course_code
     WHERE s.office_id = ?${statusFilter}
     ORDER BY s.name ASC`,
    [scopedOfficeId]
  );
  return rows || [];
}

export async function createSection(nameRaw, courseCodeRaw, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  const name = String(nameRaw || "").trim();
  const courseCode = String(courseCodeRaw || "").trim().toUpperCase();

  if (!name) throw new Error("Missing section name");
  const safeCode = courseCode || "UNKN";

  // Ensure course exists
  const course = await dbGet("SELECT code FROM courses WHERE office_id = ? AND code = ?", [scopedOfficeId, safeCode]);
  if (!course) {
    if (safeCode === "UNKN") {
       await dbRun("INSERT INTO courses (office_id, code, name) VALUES (?, 'UNKN', 'Unknown') ON CONFLICT (office_id, code) DO NOTHING", [scopedOfficeId]);
    } else {
       throw new Error(`Course ${safeCode} not found`);
    }
  }

  // Existence check
  const existing = await dbGet("SELECT id FROM sections WHERE office_id = ? AND name = ? AND COALESCE(course_code, 'UNKN') = ?", [scopedOfficeId, name, safeCode]);
  if (existing) throw new Error("Section name already exists for this degree program");

  // Insert
  const res = await dbRun("INSERT INTO sections (office_id, name, course_code, status) VALUES (?, ?, ?, 'Active')", [scopedOfficeId, name, safeCode]);

  if (!res || res.lastInsertRowid === null || res.lastInsertRowid === undefined) {
    throw new Error("Failed to insert course block: No ID returned from database");
  }

  // Retrieve with synthetic fallback to prevent null pointer crashes in logging
  const created = await dbGet(
    `SELECT s.*, c.name as course_name
     FROM sections s
     LEFT JOIN courses c ON c.office_id = s.office_id AND c.code = s.course_code
     WHERE s.office_id = ? AND s.id = ?`,
    [scopedOfficeId, res.lastInsertRowid]
  );

  if (!created) {
    return {
      id: res.lastInsertRowid,
      office_id: scopedOfficeId,
      name,
      course_code: safeCode,
      status: "Active"
    };
  }

  return created;
}

export async function updateSection(id, nameRaw, courseCodeRaw, status = "Active", officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  const name = String(nameRaw || "").trim();
  const courseCode = String(courseCodeRaw || "").trim().toUpperCase();

  if (!name) throw new Error("Missing section name");
  const safeCode = courseCode || "UNKN";

  const course = await dbGet("SELECT code FROM courses WHERE office_id = ? AND code = ?", [scopedOfficeId, safeCode]);
  if (!course) throw new Error(`Course ${safeCode} not found`);

  const existing = await dbGet("SELECT id FROM sections WHERE office_id = ? AND name = ? AND COALESCE(course_code, 'UNKN') = ? AND id != ?", [scopedOfficeId, name, safeCode, id]);
  if (existing) throw new Error("Section name already exists for this degree program");

  await dbRun("UPDATE sections SET name = ?, course_code = ?, status = ? WHERE office_id = ? AND id = ?", [name, safeCode, status, scopedOfficeId, id]);

  return await dbGet(
    `SELECT s.*, c.name as course_name
     FROM sections s
     LEFT JOIN courses c ON c.office_id = s.office_id AND c.code = s.course_code
     WHERE s.office_id = ? AND s.id = ?`,
    [scopedOfficeId, id]
  );
}

export async function archiveSection(id, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  await dbRun("UPDATE sections SET status = 'Archived' WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
  return true;
}

export async function restoreSection(id, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  await dbRun("UPDATE sections SET status = 'Active' WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
  return true;
}

export async function deleteSection(id, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  await dbRun("DELETE FROM sections WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
  return true;
}

import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import { transaction } from "./postgres.js";

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

export async function createSection(nameRaw, courseCodeRaw, officeId, { upsert = false } = {}) {
  const scopedOfficeId = requireOfficeId(officeId);
  const name = String(nameRaw || "").trim();
  const courseCode = String(courseCodeRaw || "").trim().toUpperCase();

  if (!name) throw new Error("Missing section name");
  const safeCode = courseCode || "UNKN";

  return transaction(async ({ query: run, queryOne: runOne }) => {
    let course = await runOne(
      "SELECT code, status FROM courses WHERE office_id = $1 AND code = $2 FOR SHARE",
      [scopedOfficeId, safeCode]
    );
    if (!course && safeCode === "UNKN") {
      await run("INSERT INTO courses (office_id, code, name) VALUES ($1, 'UNKN', 'Unknown') ON CONFLICT (office_id, code) DO NOTHING", [scopedOfficeId]);
      course = await runOne(
        "SELECT code, status FROM courses WHERE office_id = $1 AND code = $2 FOR SHARE",
        [scopedOfficeId, safeCode]
      );
    }
    if (!course) throw new Error(`Course ${safeCode} not found`);
    if (course.status !== "Active") throw new Error("Cannot add an active course block to an archived degree program");

    const existing = await runOne(
      "SELECT id FROM sections WHERE office_id = $1 AND name = $2 AND COALESCE(course_code, 'UNKN') = $3",
      [scopedOfficeId, name, safeCode]
    );
    if (existing) {
      if (!upsert) throw new Error("Section name already exists for this degree program");
      await run("UPDATE sections SET status = 'Active', course_archived = FALSE WHERE office_id = $1 AND id = $2", [scopedOfficeId, existing.id]);
      return await runOne(
        `SELECT s.*, c.name as course_name
         FROM sections s
         LEFT JOIN courses c ON c.office_id = s.office_id AND c.code = s.course_code
         WHERE s.office_id = $1 AND s.id = $2`,
        [scopedOfficeId, existing.id]
      );
    }

    const inserted = await runOne(
      `INSERT INTO sections (office_id, name, course_code, status)
       VALUES ($1, $2, $3, 'Active')
       RETURNING id`,
      [scopedOfficeId, name, safeCode]
    );
    return runOne(
      `SELECT s.*, c.name as course_name
       FROM sections s
       LEFT JOIN courses c ON c.office_id = s.office_id AND c.code = s.course_code
       WHERE s.office_id = $1 AND s.id = $2`,
      [scopedOfficeId, inserted.id]
    );
  });
}

export async function updateSection(id, nameRaw, courseCodeRaw, status, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  const name = String(nameRaw || "").trim();
  const courseCode = String(courseCodeRaw || "").trim().toUpperCase();

  if (!name) throw new Error("Missing section name");
  const safeCode = courseCode || "UNKN";

  return transaction(async ({ query: run, queryOne: runOne }) => {
    const current = await runOne(
      "SELECT id, name, course_code, status FROM sections WHERE office_id = $1 AND id = $2 FOR UPDATE",
      [scopedOfficeId, id]
    );
    if (!current) throw new Error("Section not found");

    const course = await runOne(
      "SELECT code, status FROM courses WHERE office_id = $1 AND code = $2 FOR SHARE",
      [scopedOfficeId, safeCode]
    );
    if (!course) throw new Error(`Course ${safeCode} not found`);
    const nextStatus = status === undefined ? current.status : status;
    if (nextStatus === "Active" && course.status !== "Active") {
      throw new Error("Cannot activate a course block under an archived degree program");
    }

    const existing = await runOne(
      "SELECT id FROM sections WHERE office_id = $1 AND name = $2 AND COALESCE(course_code, 'UNKN') = $3 AND id != $4",
      [scopedOfficeId, name, safeCode, id]
    );
    if (existing) throw new Error("Section name already exists for this degree program");

    if (current.name !== name || current.course_code !== safeCode) {
      await run(
        `UPDATE document_requests dr
         SET course_code = $1
         WHERE dr.office_id = $2 AND dr.course_code = $3
           AND EXISTS (
             SELECT 1 FROM students s
             JOIN student_office_memberships som ON som.student_no = s.student_no AND som.office_id = $2
             WHERE s.student_no = dr.student_no
               AND s.course_code = $3 AND s.section = $4
           )`,
        [safeCode, scopedOfficeId, current.course_code, current.name]
      );
      await run(
        `UPDATE students s
         SET section = $1, course_code = $2, updated_at = NOW()
         WHERE s.section = $3 AND s.course_code = $4
           AND EXISTS (SELECT 1 FROM student_office_memberships som
                        WHERE som.student_no = s.student_no AND som.office_id = $5)`,
        [name, safeCode, current.name, current.course_code, scopedOfficeId]
      );
    }

    await run(
      "UPDATE sections SET name = $1, course_code = $2, status = $3, course_archived = FALSE WHERE office_id = $4 AND id = $5",
      [name, safeCode, nextStatus, scopedOfficeId, id]
    );

    return await runOne(
      `SELECT s.*, c.name as course_name
       FROM sections s
       LEFT JOIN courses c ON c.office_id = s.office_id AND c.code = s.course_code
       WHERE s.office_id = $1 AND s.id = $2`,
      [scopedOfficeId, id]
    );
  });
}

export async function archiveSection(id, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  await dbRun("UPDATE sections SET status = 'Archived', course_archived = FALSE WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
  return true;
}

export async function restoreSection(id, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  return transaction(async ({ query: run, queryOne: runOne }) => {
    const section = await runOne(
      "SELECT course_code FROM sections WHERE office_id = $1 AND id = $2 FOR UPDATE",
      [scopedOfficeId, id]
    );
    if (!section) return false;
    const course = await runOne(
      "SELECT status FROM courses WHERE office_id = $1 AND code = $2 FOR SHARE",
      [scopedOfficeId, section.course_code]
    );
    if (!course || course.status !== "Active") {
      throw new Error("Restore the degree program before restoring its course block");
    }
    await run("UPDATE sections SET status = 'Active', course_archived = FALSE WHERE office_id = $1 AND id = $2", [scopedOfficeId, id]);
    return true;
  });
}

export async function deleteSection(id, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  await dbRun("DELETE FROM sections WHERE office_id = ? AND id = ?", [scopedOfficeId, id]);
  return true;
}

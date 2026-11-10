import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import { transaction } from "./postgres.js";

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

export async function createCourse(codeRaw, nameRaw, officeId, { upsert = false } = {}) {
  const scopedOfficeId = requireOfficeId(officeId);
  const code = String(codeRaw || "").trim().toUpperCase();
  const name = String(nameRaw || "").trim();

  if (!code || !name) throw new Error("Missing code or name");

  const existing = await dbGet("SELECT id FROM courses WHERE office_id = ? AND code = ?", [scopedOfficeId, code]);
  if (existing) {
    if (upsert) {
      await dbRun("UPDATE courses SET name = ?, status = 'Active' WHERE office_id = ? AND id = ?", [name, scopedOfficeId, existing.id]);
      return await dbGet("SELECT * FROM courses WHERE office_id = ? AND id = ?", [scopedOfficeId, existing.id]);
    }
    throw new Error("Course code already exists");
  }

  const res = await dbRun("INSERT INTO courses (office_id, code, name, status) VALUES (?, ?, ?, 'Active')", [
    scopedOfficeId,
    code,
    name,
  ]);

  return await dbGet("SELECT * FROM courses WHERE office_id = ? AND id = ?", [scopedOfficeId, res.lastInsertRowid]);
}

export async function updateCourse(id, codeRaw, nameRaw, status, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  const code = String(codeRaw || "").trim().toUpperCase();
  const name = String(nameRaw || "").trim();

  if (!code || !name) throw new Error("Missing code or name");

  return transaction(async ({ query: run, queryOne: runOne }) => {
    const current = await runOne(
      "SELECT id, code, name, status FROM courses WHERE office_id = $1 AND id = $2 FOR UPDATE",
      [scopedOfficeId, id]
    );
    if (!current) throw new Error("Course not found");

    const existing = await runOne(
      "SELECT id FROM courses WHERE office_id = $1 AND code = $2 AND id != $3",
      [scopedOfficeId, code, id]
    );
    if (existing) throw new Error("Course code already exists");

    const nextStatus = status === undefined ? current.status : status;
    const updated = await runOne(
      `UPDATE courses SET code = $1, name = $2, status = $3
       WHERE office_id = $4 AND id = $5
       RETURNING *`,
      [code, name, nextStatus, scopedOfficeId, id]
    );

    if (current.code !== code) {
      // 1. Cascade to sections
      await run(
        `UPDATE sections SET course_code = $1 WHERE office_id = $2 AND course_code = $3`,
        [code, scopedOfficeId, current.code]
      );

      // 2. Cascade to students associated with this office
      await run(
        `UPDATE students s
         SET course_code = $1, updated_at = NOW()
         WHERE s.course_code = $2
           AND EXISTS (
             SELECT 1 FROM student_office_memberships som
             WHERE som.student_no = s.student_no
               AND som.office_id = $3
           )`,
        [code, current.code, scopedOfficeId]
      );

      // 3. Cascade to document_requests within this office
      await run(
        `UPDATE document_requests SET course_code = $1 WHERE office_id = $2 AND course_code = $3`,
        [code, scopedOfficeId, current.code]
      );
    }

    if (nextStatus === "Archived") {
      await run(
        "UPDATE sections SET status = 'Archived', course_archived = TRUE WHERE office_id = $1 AND course_code = $2 AND status = 'Active'",
        [scopedOfficeId, code]
      );
    } else if (nextStatus === "Active" && current.status === "Archived") {
      await run(
        "UPDATE sections SET status = 'Active', course_archived = FALSE WHERE office_id = $1 AND course_code = $2 AND course_archived = TRUE",
        [scopedOfficeId, code]
      );
    }

    return updated;
  });
}

export async function archiveCourse(id, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  return transaction(async ({ query: run, queryOne: runOne }) => {
    const course = await runOne("SELECT code FROM courses WHERE office_id = $1 AND id = $2 FOR UPDATE", [scopedOfficeId, id]);
    if (!course) return false;
    await run(
      "UPDATE sections SET status = 'Archived', course_archived = TRUE WHERE office_id = $1 AND course_code = $2 AND status = 'Active'",
      [scopedOfficeId, course.code]
    );
    await run("UPDATE courses SET status = 'Archived' WHERE office_id = $1 AND id = $2", [scopedOfficeId, id]);
    return true;
  });
}

export async function restoreCourse(id, officeId) {
  const scopedOfficeId = requireOfficeId(officeId);
  return transaction(async ({ query: run, queryOne: runOne }) => {
    const course = await runOne(
      "UPDATE courses SET status = 'Active' WHERE office_id = $1 AND id = $2 RETURNING code",
      [scopedOfficeId, id]
    );
    if (!course) return false;
    await run(
      "UPDATE sections SET status = 'Active', course_archived = FALSE WHERE office_id = $1 AND course_code = $2 AND course_archived = TRUE",
      [scopedOfficeId, course.code]
    );
    return true;
  });
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

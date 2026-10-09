import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import { transaction } from "./postgres.js";
import { encryptPII } from "./piiEncryption.js";
import { decryptStudentRow } from "./studentAuth.js";
import { canonicalizeCabinetId } from "./storageLayoutUtils.js";
import { matchesSearchQuery } from "./searchUtils.js";

async function hasPhysicalStorage() {
  return true;
}

const STUDENT_SELECT = `
  student_no, name, course_code, year_level, section, status,
  storage_room AS room, storage_cabinet AS cabinet, storage_drawer AS drawer,
  created_at, updated_at
`;

function normalizeOfficeId(officeId) {
  const value = String(officeId || "").trim().toLowerCase();
  return value || null;
}

function buildOfficeScope(officeId, tableAlias = "students") {
  const normalized = normalizeOfficeId(officeId);
  if (!normalized) return { sql: "", params: [] };
  return {
    sql: `EXISTS (
      SELECT 1
      FROM student_office_memberships som
      WHERE som.student_no = ${tableAlias}.student_no
        AND som.office_id = ?
        AND som.status = 'Active'
    )`,
    params: [normalized],
  };
}

async function ensureStudentOfficeMembership(studentNo, officeId) {
  const normalized = normalizeOfficeId(officeId);
  if (!normalized) throw new Error("Office scope is required");
  await dbRun(
    `INSERT INTO student_office_memberships (student_no, office_id, status)
     VALUES (?, ?, 'Active')
     ON CONFLICT (student_no, office_id)
     DO UPDATE SET status = 'Active', updated_at = CURRENT_TIMESTAMP`,
    [studentNo, normalized],
  );
}

function normalizeStudentName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export async function createStudent({
  studentNo,
  name,
  courseCode,
  yearLevel,
  section,
  room,
  cabinet,
  drawer,
  status,
  officeId,
}) {
  const normalizedOfficeId = normalizeOfficeId(officeId);
  if (!normalizedOfficeId) throw new Error("Office scope is required");
  const normalizedCourseCode = String(courseCode || "").trim().toUpperCase();
  const normalizedName = encryptPII(normalizeStudentName(name));
  const normalizedSection = String(section || "").trim();
  const academicYear = parseInt(yearLevel);
  const hasStorage = await hasPhysicalStorage();
  await transaction(async ({ query: run, queryOne: runOne }) => {
    const course = await runOne(
      "SELECT code FROM courses WHERE office_id = $1 AND upper(code) = upper($2)",
      [normalizedOfficeId, normalizedCourseCode]
    );
    if (!course) throw new Error(`Invalid courseCode: ${normalizedCourseCode}`);

    const sectionRow = await runOne(
      `SELECT id, course_code FROM sections
       WHERE office_id = $1 AND name = $2 AND (course_code = $3 OR course_code IS NULL)
       ORDER BY CASE WHEN course_code = $3 THEN 0 ELSE 1 END
       LIMIT 1 FOR UPDATE`,
      [normalizedOfficeId, normalizedSection, normalizedCourseCode]
    );
    if (!sectionRow) {
      throw new Error(`Section ${normalizedSection} is not defined for course ${normalizedCourseCode}`);
    }
    if (!sectionRow.course_code) {
      await run("UPDATE sections SET course_code = $1 WHERE office_id = $2 AND id = $3", [
        normalizedCourseCode,
        normalizedOfficeId,
        sectionRow.id,
      ]);
    }

    if (hasStorage) {
      await run(
        `INSERT INTO students (
          student_no, name, course_code, year_level, section,
          storage_room, storage_cabinet, storage_drawer, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [studentNo, normalizedName, normalizedCourseCode, academicYear, normalizedSection,
          room, canonicalizeCabinetId(cabinet), drawer, status || "Active"]
      );
    } else {
      await run(
        `INSERT INTO students (student_no, name, course_code, year_level, section, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [studentNo, normalizedName, normalizedCourseCode, academicYear, normalizedSection, status || "Active"]
      );
    }

    await run(
      `INSERT INTO student_office_memberships (student_no, office_id, status)
       VALUES ($1, $2, 'Active')
       ON CONFLICT (student_no, office_id)
       DO UPDATE SET status = 'Active', updated_at = CURRENT_TIMESTAMP`,
      [studentNo, normalizedOfficeId]
    );
  });

  return await getStudentByStudentNo(studentNo, { officeId: normalizedOfficeId });
}

export async function upsertStudent({
  studentNo,
  name,
  courseCode,
  yearLevel,
  section,
  room,
  cabinet,
  drawer,
  status,
  officeId,
}) {
  const existing = await getStudentByStudentNo(studentNo);
  if (existing) {
    await ensureStudentOfficeMembership(studentNo, officeId);
    return existing;
  }

  return await createStudent({
    studentNo,
    name,
    courseCode,
    yearLevel,
    section,
    room,
    cabinet,
    drawer,
    status,
    officeId,
  });
}

export async function listStudents({
  officeId,
  q,
  courseCode,
  yearLevel,
  section,
  status = "Active",
  includeArchived = false,
  limit = 200,
  offset = 0,
} = {}) {
  const filters = [];
  const params = [];

  const officeScope = buildOfficeScope(officeId);
  if (officeScope.sql) {
    filters.push(officeScope.sql);
    params.push(...officeScope.params);
  }

  if (courseCode) {
    filters.push("course_code = ?");
    params.push(courseCode);
  }

  if (yearLevel !== undefined && yearLevel !== null && yearLevel !== "") {
    filters.push("year_level = ?");
    params.push(parseInt(yearLevel));
  }

  if (section) {
    filters.push("section = ?");
    params.push(section);
  }

  if (!includeArchived) {
    filters.push("status = ?");
    params.push(status);
  }



  const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);

  const cleanQ = String(q || "").trim();
  const isStudentNoOnly = Boolean(cleanQ && /^[\d-]+$/.test(cleanQ));

  if (isStudentNoOnly) {
    filters.push("(student_no ILIKE ? OR REPLACE(student_no, '-', '') ILIKE ?)");
    const stripped = cleanQ.replace(/-/g, "");
    params.push(`%${cleanQ}%`, `%${stripped}%`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  let rows;
  if (!cleanQ || isStudentNoOnly) {
    const orderClause = isStudentNoOnly ? "ORDER BY student_no ASC" : "ORDER BY updated_at DESC";
    rows = await dbAll(
      `SELECT ${STUDENT_SELECT} FROM students ${where} ${orderClause} LIMIT ? OFFSET ?`,
      [...params, lim, off]
    );
    return (rows || []).map(decryptStudentRow);
  } else {
    rows = await dbAll(`SELECT ${STUDENT_SELECT} FROM students ${where}`, [...params]);
  }

  let decryptedRows = (rows || []).map(decryptStudentRow);
  if (cleanQ) {
    decryptedRows = decryptedRows.filter((r) =>
      matchesSearchQuery([r.student_no, r.name], cleanQ)
    );

    decryptedRows.sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return decryptedRows.slice(off, off + lim);
  }

  return decryptedRows;
}

export async function getStudentByStudentNo(studentNo, { officeId } = {}) {
  const officeScope = buildOfficeScope(officeId);
  const filters = ["student_no = ?"];
  const params = [studentNo];
  if (officeScope.sql) {
    filters.push(officeScope.sql);
    params.push(...officeScope.params);
  }
  const row = await dbGet(`SELECT ${STUDENT_SELECT} FROM students WHERE ${filters.join(" AND ")}`, params);
  return decryptStudentRow(row) || null;
}

export async function updateStudent(studentNo, patch) {
  const officeId = normalizeOfficeId(patch?.officeId);
  if (!officeId) throw new Error("Office scope is required");
  const hasStorage = await hasPhysicalStorage();
  const updated = await transaction(async ({ query: run, queryOne: runOne }) => {
    const currentRaw = await runOne(
      `SELECT ${STUDENT_SELECT} FROM students
       WHERE student_no = $1
         AND EXISTS (SELECT 1 FROM student_office_memberships som
                     WHERE som.student_no = students.student_no AND som.office_id = $2 AND som.status = 'Active')
       FOR UPDATE`,
      [studentNo, officeId]
    );
    if (!currentRaw) return false;
    const existing = decryptStudentRow(currentRaw);
    const rawName = patch.name === undefined || patch.name === null
      ? existing.name
      : normalizeStudentName(patch.name);
    const next = {
      name: encryptPII(rawName),
      course_code: String(patch.courseCode ?? existing.course_code).trim().toUpperCase(),
      year_level: patch.yearLevel === undefined ? existing.year_level : Number(patch.yearLevel),
      section: String(patch.section ?? existing.section).trim(),
      status: patch.status ?? existing.status,
    };

    const course = await runOne(
      "SELECT code FROM courses WHERE office_id = $1 AND upper(code) = upper($2)",
      [officeId, next.course_code]
    );
    if (!course) throw new Error(`Invalid courseCode: ${next.course_code}`);
    const sectionRow = await runOne(
      `SELECT id, course_code FROM sections
       WHERE office_id = $1 AND name = $2 AND (course_code = $3 OR course_code IS NULL)
       ORDER BY CASE WHEN course_code = $3 THEN 0 ELSE 1 END
       LIMIT 1 FOR UPDATE`,
      [officeId, next.section, next.course_code]
    );
    if (!sectionRow) throw new Error(`Section ${next.section} is not defined for course ${next.course_code}`);
    if (!sectionRow.course_code) {
      await run("UPDATE sections SET course_code = $1 WHERE office_id = $2 AND id = $3", [
        next.course_code, officeId, sectionRow.id,
      ]);
    }

    if (hasStorage) {
      const room = patch.room === undefined ? existing.room : Number(patch.room);
      const cabinet = canonicalizeCabinetId(patch.cabinet ?? existing.cabinet);
      const drawer = patch.drawer === undefined ? existing.drawer : Number(patch.drawer);
      await run(
        `UPDATE students
         SET name = $1, course_code = $2, year_level = $3, section = $4,
             storage_room = $5, storage_cabinet = $6, storage_drawer = $7, status = $8
         WHERE student_no = $9
           AND EXISTS (SELECT 1 FROM student_office_memberships som
                       WHERE som.student_no = students.student_no AND som.office_id = $10 AND som.status = 'Active')`,
        [next.name, next.course_code, next.year_level, next.section, room, cabinet, drawer, next.status, studentNo, officeId]
      );
    } else {
      await run(
        `UPDATE students SET name = $1, course_code = $2, year_level = $3, section = $4, status = $5
         WHERE student_no = $6
           AND EXISTS (SELECT 1 FROM student_office_memberships som
                       WHERE som.student_no = students.student_no AND som.office_id = $7 AND som.status = 'Active')`,
        [next.name, next.course_code, next.year_level, next.section, next.status, studentNo, officeId]
      );
    }
    return true;
  });
  if (!updated) return null;
  return await getStudentByStudentNo(studentNo, { officeId });
}

export async function archiveStudent(studentNo, { officeId } = {}) {
  const existing = await getStudentByStudentNo(studentNo, { officeId });
  if (!existing) return null;
  const scope = buildOfficeScope(officeId);
  await dbRun(`UPDATE students SET status = 'Archived' WHERE student_no = ?${scope.sql ? ` AND ${scope.sql}` : ""}`, [studentNo, ...scope.params]);
  return { ...existing, status: "Archived" };
}

export async function restoreStudent(studentNo, { officeId } = {}) {
  const existing = await getStudentByStudentNo(studentNo, { officeId });
  if (!existing) return null;
  const scope = buildOfficeScope(officeId);
  await dbRun(`UPDATE students SET status = 'Active' WHERE student_no = ?${scope.sql ? ` AND ${scope.sql}` : ""}`, [studentNo, ...scope.params]);
  return { ...existing, status: "Active" };
}

export async function deleteStudent(studentNo, { officeId } = {}) {
  const existing = await getStudentByStudentNo(studentNo, { officeId });
  if (!existing) return null;
  const scope = buildOfficeScope(officeId);
  await dbRun(`DELETE FROM students WHERE student_no = ?${scope.sql ? ` AND ${scope.sql}` : ""}`, [studentNo, ...scope.params]);
  return existing;
}

export async function listStudentLocationUsage({ officeId } = {}) {
  const hasStorage = await hasPhysicalStorage();
  if (!hasStorage) return [];

  const scope = buildOfficeScope(officeId);
  return await dbAll(
    `
      SELECT storage_room AS room, storage_cabinet AS cabinet, storage_drawer AS drawer, COUNT(*) as count
      FROM students
      WHERE status = 'Active'${scope.sql ? ` AND ${scope.sql}` : ""}
      GROUP BY storage_room, storage_cabinet, storage_drawer
      ORDER BY storage_room ASC, storage_cabinet ASC, storage_drawer ASC
    `,
    scope.params,
  );
}

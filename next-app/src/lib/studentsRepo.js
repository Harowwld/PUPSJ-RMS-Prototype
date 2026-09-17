import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import { encryptPII, decryptPII } from "./piiEncryption.js";
import { decryptStudentRow } from "./studentAuth.js";
import { canonicalizeCabinetId } from "./storageLayoutUtils.js";

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

async function ensureCourseSectionMapping(courseCodeRaw, sectionRaw, officeId) {
  const courseCode = String(courseCodeRaw || "").trim().toUpperCase();
  const section = String(sectionRaw || "").trim();
  const scopedOfficeId = String(officeId || "").trim().toLowerCase();
  if (!scopedOfficeId) throw new Error("Office scope is required");

  const course = await dbGet("SELECT code FROM courses WHERE office_id = ? AND upper(code) = upper(?)", [
    scopedOfficeId,
    courseCode,
  ]);
  if (!course) {
    throw new Error(`Invalid courseCode: ${courseCode}`);
  }

  // Look up section by BOTH name AND course_code to avoid cross-course confusion
  const sectionRow = await dbGet(
    "SELECT id, course_code FROM sections WHERE office_id = ? AND name = ? AND COALESCE(course_code, '') = ?",
    [scopedOfficeId, section, courseCode]
  );
  if (!sectionRow) {
    throw new Error(`Section ${section} is not defined for course ${courseCode}`);
  }

  const linkedCourse = String(sectionRow.course_code || "").trim().toUpperCase();
  if (linkedCourse && linkedCourse !== courseCode) {
    throw new Error(
      `Section ${section} is linked to ${linkedCourse}, not ${courseCode}`
    );
  }

  // Auto-link legacy section records that don't yet have a course assigned.
  if (!linkedCourse) {
    await dbRun("UPDATE sections SET course_code = ? WHERE office_id = ? AND id = ?", [
      courseCode,
      scopedOfficeId,
      sectionRow.id,
    ]);
  }
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
  await ensureCourseSectionMapping(normalizedCourseCode, normalizedSection, normalizedOfficeId);

  const academicYear = parseInt(yearLevel);

  const hasStorage = await hasPhysicalStorage();
  if (hasStorage) {
    const normalizedCabinet = canonicalizeCabinetId(cabinet);
    await dbRun(
      `
      INSERT INTO students (
        student_no,
        name,
        course_code,
        year_level,
        section,
        storage_room,
        storage_cabinet,
        storage_drawer,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        studentNo,
        normalizedName,
        normalizedCourseCode,
        academicYear,
        normalizedSection,
        room,
        normalizedCabinet,
        drawer,
        status || "Active",
      ]
    );
  } else {
    await dbRun(
      `
      INSERT INTO students (
        student_no,
        name,
        course_code,
        year_level,
        section,
        status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        studentNo,
        normalizedName,
        normalizedCourseCode,
        academicYear,
        normalizedSection,
        status || "Active",
      ]
    );
  }

  await ensureStudentOfficeMembership(studentNo, normalizedOfficeId);

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
    filters.push("student_no LIKE ?");
    params.push(`%${cleanQ}%`);
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
    const search = cleanQ.toLowerCase();
    decryptedRows = decryptedRows.filter(r => {
      if (r.student_no && r.student_no.toLowerCase().includes(search)) return true;
      if (r.name && r.name.toLowerCase().includes(search)) return true;
      return false;
    });

    decryptedRows.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
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
  const existing = await getStudentByStudentNo(studentNo, { officeId });
  if (!existing) return null;

  const next = {
    name:
      patch.name === undefined || patch.name === null
        ? existing.name
        : normalizeStudentName(patch.name),
    course_code: String(patch.courseCode ?? existing.course_code).trim().toUpperCase(),
    year_level:
      patch.yearLevel === undefined ? existing.year_level : parseInt(patch.yearLevel),
    section: String(patch.section ?? existing.section).trim(),
    status: patch.status ?? existing.status,
  };

  await ensureCourseSectionMapping(next.course_code, next.section, officeId);

  const hasStorage = await hasPhysicalStorage();
  if (hasStorage) {
    const room = patch.room === undefined ? existing.room : parseInt(patch.room);
    const cabinet = canonicalizeCabinetId(patch.cabinet ?? existing.cabinet);
    const drawer = patch.drawer === undefined ? existing.drawer : parseInt(patch.drawer);

    await dbRun(
      `
      UPDATE students
      SET name = ?, course_code = ?, year_level = ?, section = ?, storage_room = ?, storage_cabinet = ?, storage_drawer = ?, status = ?
      WHERE student_no = ?
        AND EXISTS (SELECT 1 FROM student_office_memberships som WHERE som.student_no = students.student_no AND som.office_id = ? AND som.status = 'Active')
    `,
      [
        next.name,
        next.course_code,
        next.year_level,
        next.section,
        room,
        cabinet,
        drawer,
        next.status,
        studentNo,
        officeId,
      ]
    );
  } else {
    await dbRun(
      `
      UPDATE students
      SET name = ?, course_code = ?, year_level = ?, section = ?, status = ?
      WHERE student_no = ?
        AND EXISTS (SELECT 1 FROM student_office_memberships som WHERE som.student_no = students.student_no AND som.office_id = ? AND som.status = 'Active')
    `,
      [
        next.name,
        next.course_code,
        next.year_level,
        next.section,
        next.status,
        studentNo,
        officeId,
      ]
    );
  }

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

export async function reassignStudentsByLocationMappings(mappings = [], { officeId } = {}) {
  if (!Array.isArray(mappings) || mappings.length === 0) {
    return { moved: 0, breakdown: [] };
  }
  const hasStorage = await hasPhysicalStorage();
  if (!hasStorage) {
    return { moved: 0, breakdown: [] };
  }

  let moved = 0;
  const breakdown = [];
  const scope = buildOfficeScope(officeId);
  for (const m of mappings) {
    const fromRoom = Number(m?.from?.room);
    const fromCabinet = canonicalizeCabinetId(m?.from?.cabinet);
    const fromDrawer = Number(m?.from?.drawer);
    const toRoom = Number(m?.to?.room);
    const toCabinet = canonicalizeCabinetId(m?.to?.cabinet);
    const toDrawer = Number(m?.to?.drawer);
    if (
      !Number.isFinite(fromRoom) ||
      !fromCabinet ||
      !Number.isFinite(fromDrawer) ||
      !Number.isFinite(toRoom) ||
      !toCabinet ||
      !Number.isFinite(toDrawer)
    ) {
      continue;
    }
    const res = await dbRun(
      `
        UPDATE students
        SET storage_room = ?, storage_cabinet = ?, storage_drawer = ?
        WHERE storage_room = ? AND storage_cabinet = ? AND storage_drawer = ?${scope.sql ? ` AND ${scope.sql}` : ""}
      `,
      [toRoom, toCabinet, toDrawer, fromRoom, fromCabinet, fromDrawer, ...scope.params],
    );
    const changed = Number(res?.changes || 0);
    moved += changed;
    breakdown.push({
      from: { room: fromRoom, cabinet: fromCabinet, drawer: fromDrawer },
      to: { room: toRoom, cabinet: toCabinet, drawer: toDrawer },
      moved: changed,
    });
  }
  return { moved, breakdown };
}

import { dbAll, dbGet, dbRun } from "./sqlite";

async function ensureCourseSectionMapping(courseCodeRaw, sectionRaw) {
  const courseCode = String(courseCodeRaw || "").trim().toUpperCase();
  const section = String(sectionRaw || "").trim();

  const course = await dbGet("SELECT code FROM courses WHERE upper(code) = upper(?)", [
    courseCode,
  ]);
  if (!course) {
    throw new Error(`Invalid courseCode: ${courseCode}`);
  }

  const sectionRow = await dbGet(
    "SELECT id, course_code FROM sections WHERE name = ?",
    [section]
  );
  if (!sectionRow) {
    throw new Error(`Invalid section: ${section}`);
  }

  const linkedCourse = String(sectionRow.course_code || "").trim().toUpperCase();
  if (linkedCourse && linkedCourse !== courseCode) {
    throw new Error(
      `Section ${section} is linked to ${linkedCourse}, not ${courseCode}`
    );
  }

  // Auto-link legacy section records that don't yet have a course assigned.
  if (!linkedCourse) {
    await dbRun("UPDATE sections SET course_code = ? WHERE id = ?", [
      courseCode,
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
}) {
  const normalizedCourseCode = String(courseCode || "").trim().toUpperCase();
  const normalizedSection = String(section || "").trim();
  await ensureCourseSectionMapping(normalizedCourseCode, normalizedSection);

  const academicYear = parseInt(yearLevel);
  await dbRun(
    `
    INSERT INTO students (
      student_no,
      name,
      course_code,
      year_level,
      section,
      room,
      cabinet,
      drawer,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      studentNo,
      name,
      normalizedCourseCode,
      academicYear,
      normalizedSection,
      room,
      cabinet,
      drawer,
      status || "Active",
    ]
  );

  return await getStudentByStudentNo(studentNo);
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
}) {
  const existing = await getStudentByStudentNo(studentNo);
  if (existing) return existing;

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
  });
}

export async function listStudents({
  q,
  courseCode,
  yearLevel,
  section,
  limit = 200,
  offset = 0,
} = {}) {
  const filters = [];
  const params = [];

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

  if (q) {
    filters.push("(student_no LIKE ? OR name LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);

  return await dbAll(
    `
      SELECT *
      FROM students
      ${where}
      ORDER BY name ASC
      LIMIT ? OFFSET ?
    `,
    [...params, lim, off]
  );
}

export async function getStudentByStudentNo(studentNo) {
  const row = await dbGet("SELECT * FROM students WHERE student_no = ?", [studentNo]);
  return row || null;
}

export async function updateStudent(studentNo, patch) {
  const existing = await getStudentByStudentNo(studentNo);
  if (!existing) return null;

  const next = {
    name: patch.name ?? existing.name,
    course_code: String(patch.courseCode ?? existing.course_code).trim().toUpperCase(),
    year_level:
      patch.yearLevel === undefined ? existing.year_level : parseInt(patch.yearLevel),
    section: String(patch.section ?? existing.section).trim(),
    room: patch.room === undefined ? existing.room : parseInt(patch.room),
    cabinet: patch.cabinet ?? existing.cabinet,
    drawer: patch.drawer === undefined ? existing.drawer : parseInt(patch.drawer),
    status: patch.status ?? existing.status,
  };

  await ensureCourseSectionMapping(next.course_code, next.section);

  await dbRun(
    `
    UPDATE students
    SET name = ?, course_code = ?, year_level = ?, section = ?, room = ?, cabinet = ?, drawer = ?, status = ?
    WHERE student_no = ?
  `,
    [
      next.name,
      next.course_code,
      next.year_level,
      next.section,
      next.room,
      next.cabinet,
      next.drawer,
      next.status,
      studentNo,
    ]
  );

  return await getStudentByStudentNo(studentNo);
}

export async function deleteStudent(studentNo) {
  const existing = await getStudentByStudentNo(studentNo);
  if (!existing) return null;
  await dbRun("DELETE FROM students WHERE student_no = ?", [studentNo]);
  return existing;
}

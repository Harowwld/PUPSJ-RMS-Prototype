import { dbAll, dbGet, dbRun } from "../src/lib/sqlite.js";

function makeStudentNo(i) {
  return `2026-${String(10000 + i).padStart(5, "0")}-SJ-0`;
}

function makeStudentName(i) {
  return `Student ${String(i).padStart(2, "0")}`;
}

async function resolveTargetCourse() {
  const bsit = await dbGet("SELECT code FROM courses WHERE upper(code) = 'BSIT'");
  if (bsit?.code) return bsit.code;

  const first = await dbGet("SELECT code FROM courses ORDER BY code ASC LIMIT 1");
  if (first?.code) return first.code;

  await dbRun(
    "INSERT INTO courses (code, name) VALUES (?, ?)",
    ["BSIT", "Bachelor of Science in Information Technology"]
  );
  return "BSIT";
}

async function resolveTargetSection(courseCode) {
  const linked = await dbGet(
    "SELECT name FROM sections WHERE course_code = ? ORDER BY name ASC LIMIT 1",
    [courseCode]
  );
  if (linked?.name) return linked.name;

  const byName = await dbGet("SELECT id FROM sections WHERE name = 'Section 1'");
  if (byName?.id) {
    await dbRun("UPDATE sections SET course_code = ? WHERE id = ?", [courseCode, byName.id]);
    return "Section 1";
  }

  await dbRun("INSERT INTO sections (name, course_code) VALUES (?, ?)", [
    "Section 1",
    courseCode,
  ]);
  return "Section 1";
}

async function upsertStudents(courseCode, sectionName) {
  let created = 0;
  let updated = 0;

  for (let i = 1; i <= 30; i++) {
    const studentNo = makeStudentNo(i);
    const name = makeStudentName(i);
    const room = i <= 16 ? 1 : 2;
    const cabinet = ["A", "B", "C", "D"][Math.floor(((i - 1) % 16) / 4)];
    const drawer = ((i - 1) % 4) + 1;

    const existing = await dbGet(
      "SELECT student_no FROM students WHERE student_no = ?",
      [studentNo]
    );

    if (existing) {
      await dbRun(
        `UPDATE students
         SET name = ?, course_code = ?, year_level = ?, section = ?, room = ?, cabinet = ?, drawer = ?, status = 'Active'
         WHERE student_no = ?`,
        [name, courseCode, 2026, sectionName, room, cabinet, drawer, studentNo]
      );
      updated += 1;
    } else {
      await dbRun(
        `INSERT INTO students
         (student_no, name, course_code, year_level, section, room, cabinet, drawer, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
        [studentNo, name, courseCode, 2026, sectionName, room, cabinet, drawer]
      );
      created += 1;
    }
  }

  return { created, updated };
}

async function main() {
  const courseCode = await resolveTargetCourse();
  const sectionName = await resolveTargetSection(courseCode);
  const { created, updated } = await upsertStudents(courseCode, sectionName);

  const countRow = await dbGet(
    "SELECT COUNT(*) AS count FROM students WHERE course_code = ? AND year_level = 2026 AND section = ?",
    [courseCode, sectionName]
  );

  console.log("Seed target:", { courseCode, sectionName, year: 2026 });
  console.log("Created:", created, "Updated:", updated);
  console.log("Total students in target bucket:", countRow?.count || 0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});

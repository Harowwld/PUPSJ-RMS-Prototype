import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const officeId = String(process.env.STUDENT_IMPORT_OFFICE_ID || "").trim().toLowerCase();
if (!officeId) throw new Error("Set STUDENT_IMPORT_OFFICE_ID before running the student import.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const csvPath = path.resolve(process.cwd(), "../_SAMPLE_DATA/pup_emanage_birth_certificate_students.csv");
if (!fs.existsSync(csvPath)) throw new Error(`CSV not found at: ${csvPath}`);

function parseCsvLine(line) {
  const fields = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      fields.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  fields.push(value.trim());
  return fields;
}

const { pool } = await import("../src/lib/postgres.js");
const { getStudentByStudentNo, upsertStudent } = await import("../src/lib/studentsRepo.js");

try {
  const lines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV contains no student rows.");
  if (lines.length - 1 !== 85) throw new Error(`Expected 85 students in ${csvPath}; found ${lines.length - 1}.`);

  const parsedRows = lines.slice(1).map((line, index) => {
    const cols = parseCsvLine(line);
    if (cols.length < 8) throw new Error(`CSV row ${index + 2} has fewer than 8 columns.`);
    const [studentNo, name, courseCode, academicYear, section, room, cabinet, drawer] = cols;
    if (!studentNo) throw new Error(`CSV row ${index + 2} has no student number.`);
    if (name.includes(",")) throw new Error(`CSV row ${index + 2} must use First Middle Last name order.`);
    return { studentNo, name, courseCode, academicYear, section, room, cabinet, drawer, rowNumber: index + 2 };
  });

  if (new Set(parsedRows.map(({ studentNo }) => studentNo)).size !== parsedRows.length) {
    throw new Error(`Duplicate student number in ${csvPath}.`);
  }

  if (parsedRows.some(({ courseCode }) => courseCode.toUpperCase() === "BSA")) {
    await pool.query(
      `INSERT INTO courses (office_id, code, name, status)
       VALUES ($1, 'BSA', 'Bachelor of Science in Accountancy', 'Active')
       ON CONFLICT (office_id, code) DO UPDATE SET name = EXCLUDED.name, status = 'Active'`,
      [officeId],
    );
    await pool.query(
      `INSERT INTO sections (office_id, name, course_code, status)
       VALUES ($1, 'BSA-2A', 'BSA', 'Active')
       ON CONFLICT (office_id, name, course_code) DO UPDATE SET status = 'Active'`,
      [officeId],
    );
  }

  let imported = 0;
  let existing = 0;
  for (const { studentNo, name, courseCode, academicYear, section, room, cabinet, drawer, rowNumber } of parsedRows) {
    const studentRow = {
      studentNo,
      name,
      courseCode,
      yearLevel: Number.parseInt(academicYear, 10),
      section,
      room: Number.parseInt(room, 10),
      cabinet,
      drawer: Number.parseInt(drawer, 10),
      officeId,
    };
    if (!Number.isInteger(studentRow.yearLevel) || !Number.isInteger(studentRow.room) || !Number.isInteger(studentRow.drawer)) {
      throw new Error(`CSV row ${rowNumber} has invalid year or storage values.`);
    }

    const prior = await getStudentByStudentNo(studentNo);
    await upsertStudent(studentRow);
    if (prior) existing += 1;
    else imported += 1;
  }
  console.log(`Student CSV import finished for ${officeId}: ${imported} added, ${existing} already existed.`);
} finally {
  await pool.end();
}

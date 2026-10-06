import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const officeId = String(process.env.STUDENT_IMPORT_OFFICE_ID || "").trim().toLowerCase();
if (!officeId) throw new Error("Set STUDENT_IMPORT_OFFICE_ID before running the student import.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const csvPath = path.resolve(process.cwd(), "../_SAMPLE_DATA/cleaned_student_data.csv");
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

function formatName(rawName) {
  const words = rawName.toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) throw new Error("Student name is empty.");
  let lastName;
  let restWords;
  if (words[0] === "DEL" && words[1] === "ROSARIO") {
    lastName = "DEL ROSARIO";
    restWords = words.slice(2);
  } else if (words[0] === "DE" && words[1] === "LEON") {
    lastName = "DE LEON";
    restWords = words.slice(2);
  } else if (words[0] === "DELA" && ["PENA", "PEÑA"].includes(words[1])) {
    lastName = "DELA PEÑA";
    restWords = words.slice(2);
  } else if (["DE", "DEL", "DELA"].includes(words[0])) {
    lastName = words.slice(0, 2).join(" ");
    restWords = words.slice(2);
  } else {
    lastName = words[0];
    restWords = words.slice(1);
  }
  let middleInitial = "";
  if (restWords.length > 1 && restWords.at(-1).length === 1) {
    middleInitial = `${restWords.pop()}.`;
  }
  return `${lastName}, ${restWords.join(" ")}${middleInitial ? ` ${middleInitial}` : ""}`;
}

const { pool } = await import("../src/lib/postgres.js");
const { getStudentByStudentNo, upsertStudent } = await import("../src/lib/studentsRepo.js");

try {
  const lines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV contains no student rows.");

  const seen = new Set();
  let imported = 0;
  let existing = 0;
  for (const [index, line] of lines.slice(1).entries()) {
    const cols = parseCsvLine(line);
    if (cols.length < 8) throw new Error(`CSV row ${index + 2} has fewer than 8 columns.`);
    const [studentNo, rawName, courseCode, academicYear, section, room, cabinet, drawer] = cols;
    if (!studentNo) throw new Error(`CSV row ${index + 2} has no student number.`);
    if (seen.has(studentNo)) continue;
    seen.add(studentNo);

    const studentRow = {
      studentNo,
      name: formatName(rawName),
      courseCode,
      yearLevel: Number.parseInt(academicYear, 10),
      section,
      room: Number.parseInt(room, 10),
      cabinet,
      drawer: Number.parseInt(drawer, 10),
      officeId,
    };
    if (!Number.isInteger(studentRow.yearLevel) || !Number.isInteger(studentRow.room) || !Number.isInteger(studentRow.drawer)) {
      throw new Error(`CSV row ${index + 2} has invalid year or storage values.`);
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

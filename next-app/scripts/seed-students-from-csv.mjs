import fs from "node:fs";
import path from "node:path";
import { dbRun, getDb, reloadDb } from "../src/lib/sqlite.js";
import { createStudent } from "../src/lib/studentsRepo.js";

async function main() {
  console.log("Wiping active student and document records...");

  const db = await getDb();
  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec("DELETE FROM documents;");
  db.exec("DELETE FROM students;");
  db.exec("DELETE FROM document_requests;");
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('documents', 'document_requests');");

  console.log("Reading cleaned_student_data.csv...");
  const csvPath = path.join(process.cwd(), "../_SAMPLE_DATA/cleaned_student_data.csv");
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found at: ${csvPath}`);
  }

  const content = fs.readFileSync(csvPath, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  
  const headers = lines[0].split(",");
  const seen = new Set();
  let addedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 8) continue;
    const [studentNo, rawName, courseCode, academicYear, section, room, cabinet, drawer] = cols.map(c => c.trim());

    if (seen.has(studentNo)) {
      console.log(`- Skipping duplicate student number: ${studentNo}`);
      continue;
    }
    seen.add(studentNo);

    // Format name to "LN, FN MI." with deterministic middle initials
    const words = rawName.toUpperCase().split(/\s+/).filter(Boolean);
    let lastName = "";
    let restWords = [];

    if (words[0] === "DEL" && words[1] === "ROSARIO") {
      lastName = "DEL ROSARIO";
      restWords = words.slice(2);
    } else if (words[0] === "DE" && words[1] === "LEON") {
      lastName = "DE LEON";
      restWords = words.slice(2);
    } else if (words[0] === "DELA" && words[1] === "PENA") {
      lastName = "DELA PENA";
      restWords = words.slice(2);
    } else if (words[0] === "DELA" && words[1] === "PEÑA") {
      lastName = "DELA PEÑA";
      restWords = words.slice(2);
    } else if (words[0] === "DE" || words[0] === "DEL" || words[0] === "DELA") {
      lastName = words.slice(0, 2).join(" ");
      restWords = words.slice(2);
    } else {
      lastName = words[0];
      restWords = words.slice(1);
    }

    let firstName = restWords.join(" ");
    let mi = "";

    if (restWords.length > 1 && restWords[restWords.length - 1].length === 1) {
      mi = restWords.pop() + ".";
      firstName = restWords.join(" ");
    }

    const unifiedName = `${lastName}, ${firstName} ${mi}`;

    const studentRow = {
      studentNo,
      name: unifiedName,
      courseCode,
      yearLevel: parseInt(academicYear, 10),
      section: section, // Align sections schema (e.g. 1-2)
      room: parseInt(room, 10),
      cabinet,
      drawer: parseInt(drawer, 10),
    };

    await createStudent(studentRow);
    addedCount++;
  }

  console.log(`Successfully cleared database and seeded ${addedCount} unified students with middle initials!`);
  await new Promise(r => setTimeout(r, 200));
}

try {
  await main();
} catch (err) {
  console.error("Execution failed:", err);
} finally {
  reloadDb();
}

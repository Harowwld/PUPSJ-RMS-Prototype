import { getDb, dbAll, dbRun } from "../src/lib/sqlite.js";
import path from "node:path";
import fs from "node:fs";

async function main() {
  console.log("CWD:", process.cwd());
  console.log("LOCAL_DATA_DIR env:", process.env.LOCAL_DATA_DIR);
  
  const base = process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");
  const resolvedPath = path.join(base, "db.sqlite");
  console.log("Resolved DB Path in script:", resolvedPath);
  console.log("Resolved DB file exists:", fs.existsSync(resolvedPath));

  console.log("Connecting to database...");
  const db = await getDb();
  if (!db) {
    console.error("Failed to load sqlite database!");
    process.exit(1);
  }

  console.log("Fetching student and docType lists...");
  const students = await dbAll("SELECT student_no, name FROM students LIMIT 50");
  const dbDocTypes = await dbAll("SELECT name FROM document_types");
  
  console.log("Retrieved Students Count:", students?.length);
  console.log("Retrieved DocTypes Count:", dbDocTypes?.length);
  
  if (!students || students.length === 0) {
    console.error("No students found in the database to link requests to! Please seed mock data first.");
    process.exit(1);
  }
  if (!dbDocTypes || dbDocTypes.length === 0) {
    console.error("No document types found in the database! Please configure document types first.");
    process.exit(1);
  }

  console.log(`Found ${students.length} students and ${dbDocTypes.length} doc types. Generating many mock alumni document requests...`);

  const docTypes = dbDocTypes.map(d => d.name);

  const statuses = [
    "Pending",
    "InProgress",
    "Ready",
    "Completed",
    "Cancelled",
    "Shredded"
  ];

  const notesOptions = [
    "Requested for job application purposes.",
    "Alumni needs this for boards exam review.",
    "For transfer to another state university.",
    "Urgent request: employment verification.",
    "Verification of graduation requirements pending.",
    "Alumni requested expedited processing.",
    "Document printed, awaiting alumni pickup.",
    "Cancelled due to mismatch in student records."
  ];

  const dbStaff = await dbAll("SELECT id FROM staff LIMIT 1");
  if (!dbStaff || dbStaff.length === 0) {
    console.error("No staff members found in the database! Please seed staff members first.");
    process.exit(1);
  }
  const createdBy = dbStaff[0].id;

  // Clear existing requests if any to keep it clean, or just append
  // let's just insert 45 distinct requests to show many many entries
  let count = 0;
  for (let i = 0; i < 45; i++) {
    const student = students[i % students.length];
    const docType = docTypes[i % docTypes.length];
    const status = statuses[i % statuses.length];
    const notes = notesOptions[i % notesOptions.length];
    
    // Create request with custom timestamps to show historical progression
    const offsetDays = Math.floor(Math.random() * 30);
    const dateStr = new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19);

    await dbRun(
      `
      INSERT INTO document_requests (
        student_no, doc_type, status, notes, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        student.student_no,
        docType,
        status,
        notes,
        createdBy,
        createdBy,
        dateStr,
        dateStr
      ]
    );
    count++;
  }

  console.log(`Successfully generated and stored ${count} alumni document requests!`);
  console.log("Forcing synchronous database flush to disk...");
  const bytes = db.export();
  const dbPath = path.join(process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local"), "db.sqlite");
  fs.writeFileSync(dbPath, Buffer.from(bytes));
  console.log("Database successfully flushed to:", dbPath);
  process.exit(0);
}

main().catch(err => {
  console.error("Seeding Error:", err);
  process.exit(1);
});

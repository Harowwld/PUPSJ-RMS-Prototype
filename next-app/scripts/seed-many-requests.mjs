import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const { pool } = await import("../src/lib/postgres.js");
const statuses = ["Pending", "Deficient", "PendingPayment", "InProgress", "Ready", "Completed", "Cancelled", "Shredded"];
const notes = [
  "Requested for job application purposes.",
  "Alumni needs this for board examination review.",
  "For transfer to another state university.",
  "Urgent request: employment verification.",
  "Verification of graduation requirements pending.",
  "Alumni requested expedited processing.",
  "Document printed, awaiting alumni pickup.",
  "Cancelled due to a mismatch in student records.",
];

try {
  const students = (await pool.query(
    `SELECT student_no, identity_profile_id
       FROM students
      WHERE identity_profile_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM student_office_memberships som
           WHERE som.student_no = students.student_no
             AND som.office_id = 'registrar' AND som.status = 'Active'
        )
      ORDER BY student_no
      LIMIT 50`,
  )).rows;
  const docTypes = (await pool.query(
    `SELECT name FROM document_types
      WHERE office_id = 'registrar' AND status = 'Active' AND is_requestable = TRUE
      ORDER BY name`,
  )).rows;
  const staff = (await pool.query(
    "SELECT id FROM staff WHERE office_id = 'registrar' AND status = 'Active' ORDER BY id LIMIT 1",
  )).rows[0];

  if (!students.length) throw new Error("No linked registrar students are available to seed requests.");
  if (!docTypes.length) throw new Error("No active, requestable registrar document types are configured.");
  if (!staff) throw new Error("No active registrar staff account is available to create requests.");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < 45; i += 1) {
      const student = students[i % students.length];
      const docType = docTypes[i % docTypes.length].name;
      const status = statuses[i % statuses.length];
      const note = notes[i % notes.length];
      const createdAt = new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000);

      await client.query(
        `INSERT INTO document_requests (
           office_id, student_no, identity_profile_id, doc_type, status,
           notes, created_by, updated_by, created_at, updated_at
         ) VALUES ('registrar', $1, $2, $3, $4, $5, $6, $6, $7, $7)`,
        [student.student_no, student.identity_profile_id, docType, status, note, staff.id, createdAt],
      );
    }
    await client.query("COMMIT");
    console.log("Created 45 sample registrar document requests.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}

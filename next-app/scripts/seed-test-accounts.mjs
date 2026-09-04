import crypto from "node:crypto";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const password = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
const staffHash = crypto.createHash("sha256").update(password).digest("hex");
const studentSalt = "local-test-student-salt";
const studentHash = `${studentSalt}:${crypto.scryptSync("student123", studentSalt, 64).toString("hex")}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const staff = [
  ["PUPREGISTRAR-001", null, "Elias", "Austria", "SuperAdmin", "Administrative", "admin.default@pup.local"],
  ["PUPREGISTRAR-003", "registrar", "Elias", "Austria", "Admin", "Administrative", "admin.registrar@pup.local"],
  ["PUPREGISTRAR-002", "registrar", "Marcus", "Reyes", "Staff", "Records", "staff.registrar@pup.local"],
  ["PUPOSAS-001", "osas", "Sandra", "Gomez", "Admin", "OSAS Admin", "admin.osas@pup.local"],
];

try {
  // 1. Seed the 4 official demo personnel accounts
  for (const [id, office, fname, lname, role, section, email] of staff) {
    await pool.query(`
      INSERT INTO staff (id, office_id, fname, lname, role, section, status, email, password_hash, password_last_changed, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7, $8, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        office_id = $2,
        fname = $3,
        lname = $4,
        role = $5,
        section = $6,
        status = 'Active',
        email = $7,
        password_hash = $8,
        password_last_changed = NOW(),
        updated_at = NOW()
    `, [id, office, fname, lname, role, section, email, staffHash]);
  }

  // 2. Map legacy sample records and purge OSAS staff as requested ("osas admin only")
  await pool.query(`UPDATE document_requests SET created_by = 'PUPREGISTRAR-002' WHERE created_by = 'records.marcus@pup.local'`);
  await pool.query(`UPDATE document_requests SET updated_by = 'PUPREGISTRAR-002' WHERE updated_by = 'records.marcus@pup.local'`);
  await pool.query(`DELETE FROM staff WHERE id = 'records.marcus@pup.local' OR email = 'records.marcus@pup.local'`);
  await pool.query(`DELETE FROM staff WHERE id = 'PUPOSAS-002' OR email = 'staff.osas@pup.local'`);

  // 3. Ensure security questions and pre-seed recovery answers so demo accounts skip setup modals
  const securityQuestions = [
    [1, "What is your mother's maiden name?", true],
    [2, "What was the name of your first school?", true],
    [3, "What is your favorite color?", false],
  ];
  for (const [qid, qtext, req] of securityQuestions) {
    await pool.query(`
      INSERT INTO security_questions (id, question, is_required)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question, is_required = EXCLUDED.is_required
    `, [qid, qtext, req]);
  }

  const defaultAnswers = [
    [1, "answer1"],
    [2, "answer2"],
    [3, "blue"],
  ];
  for (const [staffId] of staff) {
    for (const [qid, ans] of defaultAnswers) {
      const aHash = crypto.createHash("sha256").update(ans.toLowerCase()).digest("hex");
      await pool.query(`
        INSERT INTO staff_security_answers (staff_id, question_id, answer_hash, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (staff_id, question_id) DO UPDATE SET answer_hash = EXCLUDED.answer_hash, updated_at = NOW()
      `, [staffId, qid, aHash]);
    }
  }

  // 4. Seed demo student accounts (including Juan Dela Cruz with existing ODRS/Proposals)
  const students = [
    ["2022-10001-MN-1", "DELA CRUZ, JUAN A.", "BSIT", 2024, "BSIT-4A", "student@pup.local"],
    ["2023-00001-IT-1", "Test Student", "BSIT", 4, "BSIT-4A", "test.student@pup.local"],
  ];

  for (const [sNo, sName, cCode, yLevel, sSection, sEmail] of students) {
    await pool.query(`
      INSERT INTO students (student_no, name, course_code, year_level, section, status, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'Active', NOW())
      ON CONFLICT (student_no) DO UPDATE SET name = EXCLUDED.name, course_code = EXCLUDED.course_code, year_level = EXCLUDED.year_level, section = EXCLUDED.section, status = 'Active', updated_at = NOW()
    `, [sNo, sName, cCode, yLevel, sSection]);

    await pool.query(`
      INSERT INTO student_accounts (student_no, email, password_hash, status, updated_at)
      VALUES ($1, $2, $3, 'Active', NOW())
      ON CONFLICT (student_no) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, status = 'Active', updated_at = NOW()
    `, [sNo, sEmail, studentHash]);
  }

  console.log("=== Demo Accounts Seeded Successfully ===");
  console.log("1. SuperAdmin:       admin.default@pup.local (or PUPREGISTRAR-001) / " + password + " -> /systemadmin");
  console.log("2. Registrar Admin:  admin.registrar@pup.local (or PUPREGISTRAR-003) / " + password + " -> /admin");
  console.log("3. Registrar Staff:  staff.registrar@pup.local (or PUPREGISTRAR-002) / " + password + " -> /staff");
  console.log("4. OSAS Admin:       admin.osas@pup.local      (or PUPOSAS-001)      / " + password + " -> /admin");
  console.log("5. Student:          student@pup.local         (or 2022-10001-MN-1)  / " + password + " or student123 -> /student");
} finally {
  await pool.end();
}


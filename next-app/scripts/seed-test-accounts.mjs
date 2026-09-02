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
  ["PUPREGISTRAR-002", "registrar", "Registrar", "Staff", "Staff", "Records", "staff.registrar@pup.local"],
  ["PUPREGISTRAR-003", "registrar", "Elias", "Austria", "Admin", "Administrative", "admin.registrar@pup.local"],
  ["PUPOSAS-001", "osas", "Sandra", "Gomez", "Admin", "OSAS Admin", "admin.osas@pup.local"],
  ["PUPOSAS-002", "osas", "Juanito", "Rizal", "Staff", "Student Affairs", "staff.osas@pup.local"],
];

try {
  for (const [id, office, fname, lname, role, section, email] of staff) {
    await pool.query(`
      INSERT INTO staff (id, office_id, fname, lname, role, section, status, email, password_hash, password_last_changed, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,'Active',$7,$8,NOW(),NOW())
      ON CONFLICT (id) DO UPDATE SET office_id=$2, fname=$3, lname=$4, role=$5, section=$6, status='Active', email=$7, password_hash=$8, password_last_changed=NOW(), updated_at=NOW()
    `, [id, office, fname, lname, role, section, email, staffHash]);
  }

  await pool.query(`
    INSERT INTO students (student_no, name, course_code, year_level, section, status, updated_at)
    VALUES ('2023-00001-IT-1', 'Test Student', 'BSIT', 4, 'BSIT-4A', 'Active', NOW())
    ON CONFLICT (student_no) DO UPDATE SET name=EXCLUDED.name, status='Active', updated_at=NOW()
  `);
  await pool.query(`
    INSERT INTO student_accounts (student_no, password_hash, status, updated_at)
    VALUES ('2023-00001-IT-1', $1, 'Active', NOW())
    ON CONFLICT (student_no) DO UPDATE SET password_hash=$1, status='Active', updated_at=NOW()
  `, [studentHash]);

  console.log("Test accounts seeded successfully.");
  console.log(`Staff password: ${password}`);
  console.log("Student: 2023-00001-IT-1 / student123");
} finally {
  await pool.end();
}

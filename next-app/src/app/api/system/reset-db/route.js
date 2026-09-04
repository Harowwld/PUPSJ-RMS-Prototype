import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/postgres";
import { createStaff } from "@/lib/staffRepo";
import { clearHealthCache } from "@/lib/healthCache";
import { buildDefaultStorageLayout } from "@/lib/storageLayoutDefaults";

export const runtime = "nodejs";

async function handleResetDb() {
  try {
    await transaction(async ({ query: txQuery }) => {
      await txQuery(`TRUNCATE TABLE
        transaction_updates, event_proposals, document_requests, documents,
        student_accounts, students, staff, global_audit_logs, backups,
        staff_notification_item_states, staff_notification_state, settings
        RESTART IDENTITY CASCADE`);
    });

    const defaultPassword = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";

    // 1. SuperAdmin (Global)
    await createStaff({
      id: "PUPSUPERADMIN-001",
      officeId: null,
      fname: "System",
      lname: "Administrator",
      role: "SuperAdmin",
      section: "System Administration",
      status: "Active",
      email: "superadmin@pup.local",
      password: defaultPassword,
    });

    // 2. Registrar Admin
    await createStaff({
      id: "PUPREGISTRAR-003",
      officeId: "registrar",
      fname: "Elias",
      lname: "Austria",
      role: "Admin",
      section: "Administrative",
      status: "Active",
      email: "admin.registrar@pup.local",
      password: defaultPassword,
    });

    // 3. Registrar Staff
    await createStaff({
      id: "PUPREGISTRAR-002",
      officeId: "registrar",
      fname: "Marcus",
      lname: "Reyes",
      role: "Staff",
      section: "Records",
      status: "Active",
      email: "staff.registrar@pup.local",
      password: defaultPassword,
    });

    // 4. OSAS Admin
    await createStaff({
      id: "PUPOSAS-001",
      officeId: "osas",
      fname: "Sandra",
      lname: "Gomez",
      role: "Admin",
      section: "OSAS Admin",
      status: "Active",
      email: "admin.osas@pup.local",
      password: defaultPassword,
    });

    // Baseline courses, sections, and document types
    for (const [code, name] of [
      ["BSIT", "Bachelor of Science in Information Technology"],
      ["BSCS", "Bachelor of Science in Computer Science"],
    ]) {
      await query(
        `INSERT INTO courses (office_id, code, name, status)
         VALUES ('registrar', $1, $2, 'Active')
         ON CONFLICT (office_id, code) DO UPDATE SET name=EXCLUDED.name, status='Active'`,
        [code, name]
      );
    }
    for (const [name, code] of [
      ["BSIT-4A", "BSIT"],
      ["BSIT-4B", "BSIT"],
      ["BSCS-3A", "BSCS"],
    ]) {
      await query(
        `INSERT INTO sections (office_id, name, course_code, status)
         VALUES ('registrar', $1, $2, 'Active')
         ON CONFLICT (office_id, name, course_code) DO UPDATE SET status='Active'`,
        [name, code]
      );
    }
    for (const name of [
      "Transcript of Records",
      "Diploma",
      "Certificate of Good Moral",
      "Form 137",
      "Certificate of Enrollment",
      "Birth Certificate",
    ]) {
      await query(
        `INSERT INTO document_types (office_id, name, name_norm, status)
         VALUES ('registrar', $1, $2, 'Active')
         ON CONFLICT (office_id, name_norm) DO UPDATE SET name=EXCLUDED.name, status='Active'`,
        [name, name.toLowerCase()]
      );
    }

    for (const [code, name] of [["BSA", "Bachelor of Science in Accountancy"]]) {
      await query(
        `INSERT INTO courses (office_id, code, name, status)
         VALUES ('osas', $1, $2, 'Active')
         ON CONFLICT (office_id, code) DO UPDATE SET name=EXCLUDED.name, status='Active'`,
        [code, name]
      );
    }
    await query(
      `INSERT INTO sections (office_id, name, course_code, status)
       VALUES ('osas', 'BSA-2A', 'BSA', 'Active')
       ON CONFLICT (office_id, name, course_code) DO UPDATE SET status='Active'`
    );
    for (const name of [
      "Good Moral Certificate",
      "Clearance Form",
      "Organization Registration Certificate",
      "Activity Permit",
    ]) {
      await query(
        `INSERT INTO document_types (office_id, name, name_norm, status)
         VALUES ('osas', $1, $2, 'Active')
         ON CONFLICT (office_id, name_norm) DO UPDATE SET name=EXCLUDED.name, status='Active'`,
        [name, name.toLowerCase()]
      );
    }

    // Ensure security questions and pre-seed recovery answers
    const securityQuestions = [
      [1, "What is your mother's maiden name?", true],
      [2, "What was the name of your first school?", true],
      [3, "What is your favorite color?", false],
    ];
    for (const [qid, qtext, req] of securityQuestions) {
      await query(
        `INSERT INTO security_questions (id, question, is_required)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question, is_required = EXCLUDED.is_required`,
        [qid, qtext, req]
      );
    }

    const staffIds = ["PUPSUPERADMIN-001", "PUPREGISTRAR-003", "PUPREGISTRAR-002", "PUPOSAS-001"];
    const defaultAnswers = [
      [1, "answer1"],
      [2, "answer2"],
      [3, "blue"],
    ];
    for (const staffId of staffIds) {
      for (const [qid, ans] of defaultAnswers) {
        const aHash = crypto.createHash("sha256").update(ans.toLowerCase()).digest("hex");
        await query(
          `INSERT INTO staff_security_answers (staff_id, question_id, answer_hash, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (staff_id, question_id) DO UPDATE SET answer_hash = EXCLUDED.answer_hash, updated_at = NOW()`,
          [staffId, qid, aHash]
        );
      }
    }

    // Seed students & student accounts for demo
    const studentSalt = "local-test-student-salt";
    const studentHash = `${studentSalt}:${crypto.scryptSync("student123", studentSalt, 64).toString("hex")}`;
    const demoStudents = [
      ["2022-10001-MN-1", "DELA CRUZ, JUAN A.", "BSIT", 2024, "BSIT-4A", "student@pup.local"],
      ["2023-00001-IT-1", "TEST STUDENT", "BSIT", 4, "BSIT-4A", "test.student@pup.local"],
    ];

    for (const [sNo, sName, cCode, yLevel, sSec, sEmail] of demoStudents) {
      await query(
        `INSERT INTO students (student_no, name, course_code, year_level, section, status)
         VALUES ($1, $2, $3, $4, $5, 'Active')
         ON CONFLICT (student_no) DO UPDATE SET name = EXCLUDED.name, course_code = EXCLUDED.course_code,
           year_level = EXCLUDED.year_level, section = EXCLUDED.section, status = 'Active', updated_at = NOW()`,
        [sNo, sName, cCode, yLevel, sSec]
      );
      await query(
        `INSERT INTO student_accounts (student_no, email, password_hash, status)
         VALUES ($1, $2, $3, 'Active')
         ON CONFLICT (student_no) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, status = 'Active', updated_at = NOW()`,
        [sNo, sEmail, studentHash]
      );
    }

    // Re-seed default storage layout and record reset timestamp
    const defaultLayout = buildDefaultStorageLayout();
    await query(
      `INSERT INTO settings (key, value)
       VALUES ('storage_layout', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(defaultLayout)]
    );
    await query(
      `INSERT INTO settings (key, value)
       VALUES ('last_reset_at', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [new Date().toISOString()]
    );

    clearHealthCache();

    return NextResponse.json({
      ok: true,
      message: `PostgreSQL data reset successfully. Demo accounts seeded. Default password: ${defaultPassword}`,
    });
  } catch (error) {
    console.error("[reset-db] Reset failed:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return handleResetDb();
}

export async function POST() {
  return handleResetDb();
}

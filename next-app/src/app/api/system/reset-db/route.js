import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/postgres";
import { createStaff } from "@/lib/staffRepo";
import { clearHealthCache } from "../health/route";

export const runtime = "nodejs";

export async function GET() {
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
      id: "PUPREGISTRAR-001",
      officeId: null,
      fname: "Elias",
      lname: "Austria",
      role: "SuperAdmin",
      section: "Administrative",
      status: "Active",
      email: "admin.default@pup.local",
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

    // Ensure security questions and pre-seed recovery answers
    const staffIds = ["PUPREGISTRAR-001", "PUPREGISTRAR-003", "PUPREGISTRAR-002", "PUPOSAS-001"];
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

    // Seed student account for demo
    const studentSalt = "local-test-student-salt";
    const studentHash = `${studentSalt}:${crypto.scryptSync("student123", studentSalt, 64).toString("hex")}`;
    await query(
      `INSERT INTO students (student_no, name, course_code, year_level, section, status)
       VALUES ('2022-10001-MN-1', 'DELA CRUZ, JUAN A.', 'BSIT', 2024, 'BSIT-4A', 'Active')
       ON CONFLICT (student_no) DO UPDATE SET name = EXCLUDED.name, status = 'Active', updated_at = NOW()`
    );
    await query(
      `INSERT INTO student_accounts (student_no, email, password_hash, status)
       VALUES ('2022-10001-MN-1', 'student@pup.local', $1, 'Active')
       ON CONFLICT (student_no) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, status = 'Active', updated_at = NOW()`,
      [studentHash]
    );

    await query("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", ["last_reset_at", new Date().toISOString()]);
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


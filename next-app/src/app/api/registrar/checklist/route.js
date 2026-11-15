import { NextResponse } from "next/server";
import { createAuthErrorResponse, requireStaff } from "@/lib/authHelpers";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { encryptPII } from "@/lib/piiEncryption";
import { signupEmail } from "@/lib/studentSignup";
import { query, transaction } from "@/lib/postgres";
import { normalizeChecklistStudentNo } from "@/lib/studentChecklist";

function fail(error, status) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function getRegistrar(req) {
  const { user, error } = await requireStaff(req);
  if (!user) return { response: createAuthErrorResponse(error || "Staff authentication required") };
  if (user.officeId !== "registrar" && user.office_id !== "registrar") {
    return { response: fail("Registrar access required.", 403) };
  }
  return { user };
}

export async function POST(req) {
  const { user, response } = await getRegistrar(req);
  if (response) return response;
  const body = await req.json().catch(() => null);
  if (body?.action === "save_odrs_email") {
    const studentNo = normalizeChecklistStudentNo(body.studentNo);
    let email;
    try { email = signupEmail(body.odrsEmail); }
    catch { return fail("Enter a valid ODRS email.", 400); }
    if (!studentNo) return fail("Enter a valid student number.", 400);
    let saved;
    try {
      saved = await query(
        `WITH matching AS (
           SELECT student_no FROM student_office_memberships
           WHERE upper(student_no) = $1 AND office_id = 'registrar' AND status = 'Active'
         )
         INSERT INTO registrar_odrs_contacts (student_no, email)
         SELECT student_no, $2 FROM matching WHERE (SELECT count(*) FROM matching) = 1
         ON CONFLICT (student_no) DO UPDATE SET email = EXCLUDED.email
         RETURNING student_no`,
        [studentNo, encryptPII(email)],
      );
    } catch (error) {
      if (error?.constraint === "registrar_odrs_contacts_email_unique") {
        return fail("This ODRS email is already recorded for another student.", 409);
      }
      throw error;
    }
    if (!saved.length) return fail("No unique active Registrar record found.", 404);
    await writeAuditLog(req, "Updated Registrar ODRS email", { details: `Student ${saved[0].student_no}` });
    return NextResponse.json({ ok: true });
  }
  const reference = typeof body?.reference === "string" ? body.reference.trim().toUpperCase() : "";
  if (!["approve", "decline"].includes(body?.action) || !/^[0-9A-F]{12}$/.test(reference)) {
    return fail("Choose a pending verification.", 400);
  }
  if (body.action === "approve" && body.confirmed !== true) return fail("Confirm that you verified the student's identity.", 400);

  const confirmedNumber = normalizeChecklistStudentNo(body.studentNo);
  if (body.action === "approve" && !confirmedNumber) return fail("Enter the student number from the verified record.", 400);

  const result = await transaction(async (tx) => {
    const pending = await tx.queryOne(
      `SELECT requested_student_no FROM student_checklist_verifications
       WHERE reference = $1 AND status = 'Pending' FOR UPDATE`,
      [reference],
    );
    if (!pending) return "handled";
    let studentNo = null;
    if (body.action === "approve") {
      if (pending.requested_student_no !== confirmedNumber) return "mismatch";
      const { rows } = await tx.query(
        `SELECT s.student_no FROM students s JOIN student_office_memberships m USING (student_no)
         WHERE upper(s.student_no) = $1 AND m.office_id = 'registrar' AND m.status = 'Active' AND s.status = 'Active'`,
        [pending.requested_student_no],
      );
      if (rows.length !== 1) return "missing";
      studentNo = rows[0].student_no;
    }
    await tx.query(
      `UPDATE student_checklist_verifications
       SET status = $2, verified_student_no = $3, reviewed_at = NOW(), reviewed_by = $4
       WHERE reference = $1`,
      [reference, studentNo ? "Verified" : "Declined", studentNo, user.id],
    );
    return "saved";
  });
  if (result === "handled") return fail("This verification is no longer pending.", 409);
  if (result === "mismatch") return fail("The verified student number does not match the number submitted with this reference.", 409);
  if (result === "missing") return fail("No unique active Registrar record found. Check the student number.", 404);
  await writeAuditLog(req, body.action === "approve" ? "Verified student checklist access" : "Declined student checklist verification", {
    details: confirmedNumber ? `Student ${confirmedNumber}` : "Checklist identity verification declined",
  });
  return NextResponse.json({ ok: true });
}

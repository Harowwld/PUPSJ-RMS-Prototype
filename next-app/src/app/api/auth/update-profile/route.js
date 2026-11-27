import { isStudentAffiliation, normalizeChecklistStudentNo } from "@/lib/studentAffiliation";
import { NextResponse } from "next/server";
import { updateStaff, getStaffByUsername, getStaffById, hasAllSecurityAnswers } from "@/lib/staffRepo";
import { writeAuditLog, writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { query, queryOne } from "@/lib/postgres";
import { requireAuth, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { encryptPII, decryptPII } from "@/lib/piiEncryption";
import { PersonNameSchema } from "@/lib/validationSchemas";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const access = await requireAuth(req);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "Authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
    const principal = access.user;
    const userId = principal.id || null;
    if (!userId || userId === "admin") {
      return NextResponse.json({ ok: false, error: "Cannot update built-in admin account" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    // ----------------------------------------------------
    // Student Profile Update
    // ----------------------------------------------------
    if (principal.principalType === "student") {
      const accountId = principal.accountId || (Number.isFinite(Number(userId)) ? Number(userId) : null);
      const studentAccount = await queryOne(
        `SELECT sa.*, sip.email AS profile_email,
                sip.client_type AS profile_client_type, sip.portal_setup_complete, sip.checklist_student_no,
                s.name, s.course_code
         FROM student_accounts sa 
         JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
         LEFT JOIN students s ON s.student_no = sa.student_no 
         WHERE (sa.id = $1 AND $1 IS NOT NULL)
            OR ($1 IS NULL AND (
              (sa.student_no IS NOT NULL AND upper(sa.student_no) = upper($2) AND $2 IS NOT NULL)
              OR (lower(sip.email) = lower($3) AND $3 IS NOT NULL)
              OR (sip.email = $4 AND $4 IS NOT NULL)
            ))
         LIMIT 1`,
        [accountId, principal.studentNo || null, principal.email || null, principal.email ? encryptPII(principal.email.toLowerCase()) : null]
      );

      if (!studentAccount) {
        return NextResponse.json({ ok: false, error: "Student account not found" }, { status: 404 });
      }

      const { fname, lname, mname, student_no, client_type, checklist_student_no } = body;
      const cleanFirst = String(fname || "").trim();
      const cleanLast = String(lname || "").trim();
      const cleanMiddle = String(mname || "").trim();
      // Email is not editable in account settings: preserve existing email
      const cleanEmail = decryptPII(studentAccount.profile_email);
      const cleanClientType = String(client_type || studentAccount.profile_client_type || "Student").trim();
      const currentStudentNo = studentAccount.student_no || "";
      const newStudentNo = String(student_no || "").trim().toUpperCase() || null;
      const normalizedCurrentStudentNo = String(currentStudentNo).trim().toUpperCase() || null;

      if (!cleanFirst || !cleanLast) {
        return NextResponse.json({ ok: false, error: "First and last name are required." }, { status: 400 });
      }
      const firstCheck = PersonNameSchema("First name").safeParse(cleanFirst);
      if (!firstCheck.success) {
        return NextResponse.json({ ok: false, error: firstCheck.error.issues[0]?.message || "Invalid first name" }, { status: 400 });
      }
      const lastCheck = PersonNameSchema("Last name").safeParse(cleanLast);
      if (!lastCheck.success) {
        return NextResponse.json({ ok: false, error: lastCheck.error.issues[0]?.message || "Invalid last name" }, { status: 400 });
      }
      if (!isStudentAffiliation(cleanClientType)) {
        return NextResponse.json({ ok: false, error: "Select a valid affiliation." }, { status: 400 });
      }
      if (currentStudentNo && cleanClientType === "Parent" && studentAccount.profile_client_type !== "Parent") {
        return NextResponse.json({ ok: false, error: "Use the parent or guardian option on the request form to request on behalf of a student." }, { status: 400 });
      }

      if (newStudentNo !== normalizedCurrentStudentNo) {
        return NextResponse.json({ ok: false, error: "Student identity cannot be changed from the authenticated account." }, { status: 403 });
      }

      const updateChecklistNumber = cleanClientType === "Student" && !currentStudentNo && checklist_student_no !== undefined;
      const checklistNumber = updateChecklistNumber ? normalizeChecklistStudentNo(checklist_student_no) : null;
      if (updateChecklistNumber && !checklistNumber && (typeof checklist_student_no !== "string" || checklist_student_no.trim())) {
        return NextResponse.json({ ok: false, error: "Enter a valid student number for Check My Records." }, { status: 400 });
      }

      if (studentAccount.portal_setup_complete === false && cleanClientType === "Student" && !currentStudentNo) {
        const setupStudentNumber = updateChecklistNumber
          ? checklistNumber
          : normalizeChecklistStudentNo(decryptPII(studentAccount.checklist_student_no));
        if (!setupStudentNumber) {
          return NextResponse.json({ ok: false, error: "Enter your student number to complete account setup." }, { status: 400 });
        }
      }

      if (studentAccount.portal_setup_complete === false && !await hasAllSecurityAnswers(studentAccount.id, "Student")) {
        return NextResponse.json({ ok: false, error: "Answer all required security questions before completing account setup." }, { status: 400 });
      }

      const middleInitial = cleanMiddle ? ` ${cleanMiddle[0].toUpperCase()}.` : "";
      const formattedFullName = `${cleanLast.toUpperCase()}, ${cleanFirst.toUpperCase()}${middleInitial}`;

      await query(
        `UPDATE student_identity_profiles
         SET first_name = $1, middle_name = $2, last_name = $3,
             display_name = $4, client_type = $5, portal_setup_complete = TRUE, updated_at = NOW(),
             checklist_student_no = CASE WHEN $7 THEN $8 ELSE checklist_student_no END
         WHERE id = $6`,
        [encryptPII(cleanFirst), encryptPII(cleanMiddle), encryptPII(cleanLast), encryptPII(formattedFullName), cleanClientType, studentAccount.identity_profile_id, updateChecklistNumber, encryptPII(checklistNumber)]
      );

      await writeGlobalAuditLog(req, "Student profile updated", {
        actor: currentStudentNo || cleanEmail,
        actor_id: currentStudentNo || null,
        role: "Student",
        details: `Updated profile details (Name: ${formattedFullName}, Client Type: ${cleanClientType})`,
        entity_type: "student_account",
        entity_id: String(studentAccount.id),
      });

      const response = NextResponse.json({
        ok: true,
        data: {
          account_id: studentAccount.id,
          student_no: currentStudentNo || "",
          fname: cleanFirst,
          lname: cleanLast,
          mname: cleanMiddle,
          email: cleanEmail,
          client_type: cleanClientType,
        },
      });

      return response;
    }

    // ----------------------------------------------------
    // Staff / Admin Profile Update
    // ----------------------------------------------------
    const { fname, lname, email } = body;

    if (fname) {
      const firstCheck = PersonNameSchema("First name").safeParse(fname);
      if (!firstCheck.success) {
        return NextResponse.json({ ok: false, error: firstCheck.error.issues[0]?.message || "Invalid first name" }, { status: 400 });
      }
    }
    if (lname) {
      const lastCheck = PersonNameSchema("Last name").safeParse(lname);
      if (!lastCheck.success) {
        return NextResponse.json({ ok: false, error: lastCheck.error.issues[0]?.message || "Invalid last name" }, { status: 400 });
      }
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
    }

    const currentStaff = await getStaffById(userId);
    if (!currentStaff) {
      return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
    }

    // Check email uniqueness if it changed
    if (email && email.toLowerCase() !== currentStaff.email.toLowerCase()) {
      const existing = await getStaffByUsername(email);
      if (existing) {
        return NextResponse.json({ ok: false, error: "That username (email) is already in use by another account" }, { status: 409 });
      }
    }

    const updatePatch = {
      fname: fname || currentStaff.fname,
      lname: lname || currentStaff.lname,
      email: email || currentStaff.email,
    };

    const updated = await updateStaff(userId, updatePatch);
    await writeAuditLog(req, `Update Profile`, { 
      details: `personnel successfully modified personal profile and contact identity (Account: ${updated.fname} ${updated.lname})`,
      entity_type: "User",
      entity_id: userId
    });

    return NextResponse.json({
      ok: true,
      data: updated,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update profile" }, { status: 500 });
  }
}

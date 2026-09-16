import { NextResponse } from "next/server";
import { updateStaff, getStaffByUsername, getStaffById } from "@/lib/staffRepo";
import { writeAuditLog, writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { query, queryOne } from "@/lib/postgres";
import { requireAuth, createAuthErrorResponse } from "../../../../lib/authHelpers";

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
        `SELECT sa.*, s.name, s.course_code 
         FROM student_accounts sa 
         LEFT JOIN students s ON s.student_no = sa.student_no 
         WHERE (sa.id = $1 AND $1 IS NOT NULL)
            OR (sa.student_no IS NOT NULL AND upper(sa.student_no) = upper($2) AND $2 IS NOT NULL)
            OR (lower(sa.email) = lower($3) AND $3 IS NOT NULL)
         LIMIT 1`,
        [accountId, principal.studentNo || null, principal.email || null]
      );

      if (!studentAccount) {
        return NextResponse.json({ ok: false, error: "Student account not found" }, { status: 404 });
      }

      const { fname, lname, mname, student_no, client_type } = body;
      const cleanFirst = String(fname || "").trim();
      const cleanLast = String(lname || "").trim();
      const cleanMiddle = String(mname || "").trim();
      // Email is not editable in account settings: preserve existing email
      const cleanEmail = studentAccount.email;
      const cleanClientType = String(client_type || studentAccount.client_type || "Student").trim();
      const currentStudentNo = studentAccount.student_no || "";
      const newStudentNo = String(student_no || "").trim().toUpperCase() || null;

      if (!cleanFirst || !cleanLast) {
        return NextResponse.json({ ok: false, error: "First and last name are required." }, { status: 400 });
      }
      if (!["Student", "Alumni"].includes(cleanClientType)) {
        return NextResponse.json({ ok: false, error: "Invalid client type. Must be Student or Alumni." }, { status: 400 });
      }

      if (newStudentNo !== currentStudentNo.toUpperCase()) {
        return NextResponse.json({ ok: false, error: "Student identity cannot be changed from the authenticated account." }, { status: 403 });
      }

      const middleInitial = cleanMiddle ? ` ${cleanMiddle[0].toUpperCase()}.` : "";
      const formattedFullName = `${cleanLast.toUpperCase()}, ${cleanFirst.toUpperCase()}${middleInitial}`;

      await query(
        `UPDATE student_accounts 
         SET first_name = $1, middle_name = $2, last_name = $3, client_type = $4, updated_at = NOW()
         WHERE id = $5`,
        [cleanFirst, cleanMiddle, cleanLast, cleanClientType, studentAccount.id]
      );

      await writeGlobalAuditLog(req, "Student profile updated", {
        actor: currentStudentNo || cleanEmail,
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
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Failed to update profile" }, { status: 500 });
  }
}

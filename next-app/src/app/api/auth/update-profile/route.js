import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "@/lib/jwt";
import { updateStaff, getStaffByUsername, getStaffById } from "@/lib/staffRepo";
import { writeAuditLog, writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { query, queryOne } from "@/lib/postgres";
import { createStudentSession } from "@/lib/studentAuth";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const cookieName = getSessionCookieName();
    const token = req.cookies.get(cookieName)?.value || "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifySessionToken(token);
    const userId = payload.sub || null;
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
    if (payload.role === "Student") {
      const accountId = payload.account_id || (Number.isFinite(Number(userId)) ? Number(userId) : null);
      const studentAccount = await queryOne(
        `SELECT sa.*, s.name, s.course_code 
         FROM student_accounts sa 
         LEFT JOIN students s ON s.student_no = sa.student_no 
         WHERE (sa.id = $1 AND $1 IS NOT NULL)
            OR (sa.student_no IS NOT NULL AND upper(sa.student_no) = upper($2) AND $2 IS NOT NULL)
            OR (lower(sa.email) = lower($3) AND $3 IS NOT NULL)
         LIMIT 1`,
        [accountId, payload.student_no || null, payload.email || payload.username || null]
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

      // Check student number uniqueness if provided and changed
      let studentNoChanged = false;
      if (newStudentNo && newStudentNo !== currentStudentNo.toUpperCase()) {
        const existingStudent = await queryOne(
          "SELECT student_no FROM students WHERE upper(student_no) = upper($1) AND upper(student_no) <> upper($2)",
          [newStudentNo, currentStudentNo]
        );
        if (existingStudent) {
          return NextResponse.json({ ok: false, error: "That student number is already assigned to another student record." }, { status: 409 });
        }
        studentNoChanged = true;
      } else if (!newStudentNo && currentStudentNo) {
        studentNoChanged = true;
      }

      const middleInitial = cleanMiddle ? ` ${cleanMiddle[0].toUpperCase()}.` : "";
      const formattedFullName = `${cleanLast.toUpperCase()}, ${cleanFirst.toUpperCase()}${middleInitial}`;

      if (newStudentNo) {
        // Ensure student record exists in students table
        const studentRow = await queryOne("SELECT student_no FROM students WHERE upper(student_no) = upper($1)", [newStudentNo]);
        if (!studentRow) {
          await query(
            `INSERT INTO students (student_no, name, status, course_code)
             VALUES ($1, $2, 'Active', $3)`,
            [newStudentNo, formattedFullName, cleanClientType === "Alumni" ? "ALUMNI" : "ENROLLED"]
          );
        } else {
          await query(
            `UPDATE students 
             SET name = $1, course_code = CASE WHEN $2 = 'Alumni' THEN 'ALUMNI' ELSE course_code END, updated_at = NOW() 
             WHERE upper(student_no) = upper($3)`,
            [formattedFullName, cleanClientType, newStudentNo]
          );
        }

        if (currentStudentNo && currentStudentNo.toUpperCase() !== newStudentNo) {
          // If previous student_no existed, update referencing records via CASCADE
          await query("UPDATE students SET student_no = $1, name = $2 WHERE upper(student_no) = upper($3)", [newStudentNo, formattedFullName, currentStudentNo]);
        }
      }

      await query(
        `UPDATE student_accounts 
         SET student_no = $1, first_name = $2, middle_name = $3, last_name = $4, client_type = $5, updated_at = NOW() 
         WHERE id = $6`,
        [newStudentNo, cleanFirst, cleanMiddle, cleanLast, cleanClientType, studentAccount.id]
      );

      await writeGlobalAuditLog(req, "Student profile updated", {
        actor: newStudentNo || cleanEmail,
        role: "Student",
        details: `Updated profile details (Name: ${formattedFullName}, Client Type: ${cleanClientType}${studentNoChanged ? `, Student No: ${newStudentNo || "cleared"}` : ""})`,
        entity_type: "student_account",
        entity_id: String(studentAccount.id),
      });

      const response = NextResponse.json({
        ok: true,
        data: {
          account_id: studentAccount.id,
          student_no: newStudentNo || "",
          fname: cleanFirst,
          lname: cleanLast,
          mname: cleanMiddle,
          email: cleanEmail,
          client_type: cleanClientType,
        },
      });

      if (studentNoChanged) {
        const newToken = await createStudentSession({
          id: studentAccount.id,
          student_no: newStudentNo,
          email: cleanEmail,
          client_type: cleanClientType,
        });
        response.cookies.set(cookieName, newToken, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
        });
      }

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
    return NextResponse.json({ ok: false, error: "Failed to update profile", details: err?.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { getStaffById, hasAllSecurityAnswers } from "../../../../lib/staffRepo";
import { getOfficeById } from "../../../../lib/officesRepo";
import { getOfficeModules } from "../../../../lib/modulesRepo";
import { query, queryOne } from "@/lib/postgres";
import { authDebug } from "@/lib/authDebug";

export const runtime = "nodejs";

function addSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export async function GET(req) {
  try {
    const cookieName = getSessionCookieName();
    const token = req.cookies.get(cookieName)?.value || "";
    
    if (!token) {
      authDebug("session_check.missing_cookie", { cookieName });
      return addSecurityHeaders(NextResponse.json({ ok: false, error: "Not authenticated: Missing token cookie" }, { status: 401 }));
    }

    const payload = await verifySessionToken(token);
    const userId = payload.sub || null;
    authDebug("session_check.token_verified", { staffId: userId, role: payload.role || null, officeId: payload.office_id || null, mustChangePassword: Boolean(payload.mustChangePassword) });

    if (payload.role === "Student" && payload.student_no) {
      const student = await queryOne("SELECT student_no, name, status FROM students WHERE student_no = $1", [payload.student_no]);
      if (!student) return addSecurityHeaders(NextResponse.json({ ok: false, error: "Student account not found" }, { status: 401 }));
      return addSecurityHeaders(NextResponse.json({ ok: true, data: {
        id: student.student_no, role: "Student", status: student.status, student_no: student.student_no,
        fname: student.name, lname: "", enabled_modules: [], preferences: { theme: "light", navigation_layout: "sidebar" },
      } }));
    }

    // Fetch fresh user data from database to get current role and status
    const staff = userId
      ? (process.env.DATABASE_URL
        ? await queryOne("SELECT * FROM staff WHERE id = $1", [userId])
        : await getStaffById(userId))
      : null;
    const currentRole = staff?.role || payload.role || null;
    const currentStatus = staff?.status || "Inactive";
    // Account setup must use the same requirement for PostgreSQL and the old
    // local adapter. Treating all PostgreSQL users as already configured made
    // the recovery-question step silently disappear after a first password
    // change.
    const hasSecurity = userId ? await hasAllSecurityAnswers(userId) : true;
    authDebug("session_check.profile_loaded", { staffId: userId, found: Boolean(staff), status: currentStatus, mustSetSecurityQuestions: !hasSecurity });

    // Multi-office context resolution
    let officeName = null;
    let accentColor = "#800000"; // default maroon
    let enabledModules = [];

    if (staff && staff.office_id) {
      const office = process.env.DATABASE_URL
        ? await queryOne("SELECT * FROM offices WHERE id = $1", [staff.office_id])
        : await getOfficeById(staff.office_id);
      if (office) {
        officeName = office.name;
        accentColor = office.accent_color || "#800000";
        const modules = process.env.DATABASE_URL
          ? await query("SELECT m.* FROM modules m JOIN office_modules om ON om.module_id = m.id WHERE om.office_id = $1 AND om.enabled = true", [staff.office_id])
          : await getOfficeModules(staff.office_id);
        enabledModules = (modules || []).map(m => m.id);
      }
    } else if (currentRole === "SuperAdmin") {
      officeName = "Super Administration";
      accentColor = "#e30000"; // eManage Brand Red
      // SuperAdmin has access to everything
      const allModules = process.env.DATABASE_URL
        ? await query("SELECT m.* FROM modules m JOIN office_modules om ON om.module_id = m.id WHERE om.office_id = 'registrar' AND om.enabled = true")
        : await getOfficeModules("registrar");
      enabledModules = (allModules || []).map(m => m.id);
    }

    const defaultPreferences = {
      theme: "light",
      navigation_layout: "sidebar",
      skip_registration_confirmation: false,
      high_contrast: false
    };

    let preferences = {};
    try {
      preferences = {
        ...defaultPreferences,
        ...JSON.parse(staff?.preferences || "{}")
      };
    } catch (e) {
      preferences = defaultPreferences;
    }

    return addSecurityHeaders(NextResponse.json({
      ok: true,
      data: {
        id: userId,
        role: currentRole,
        status: currentStatus,
        office_id: staff?.office_id || null,
        office_name: officeName,
        accent_color: accentColor,
        enabled_modules: enabledModules,
        username: payload.username || null,
        fname: staff?.fname || "",
        lname: staff?.lname || "",
        mustChangePassword: Boolean(payload.mustChangePassword),
        mustSetSecurityQuestions: !hasSecurity,
        totp_enabled: Boolean(staff?.totp_enabled),
        last_active: payload.last_active || null,
        password_last_changed: staff?.password_last_changed || null,
        avatar_filename: staff?.avatar_filename || null,
        preferences,
      },
    }));
  } catch (err) {
    authDebug("session_check.failed", { message: err instanceof Error ? err.message : String(err) });
    console.error("[GET /api/auth/me Error]:", err);
    return addSecurityHeaders(NextResponse.json({ ok: false, error: "Invalid session: " + err.message }, { status: 401 }));
  }
}

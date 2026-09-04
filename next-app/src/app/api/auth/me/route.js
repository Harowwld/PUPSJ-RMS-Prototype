import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { getStaffById, hasAllSecurityAnswers } from "../../../../lib/staffRepo";
import { getOfficeById } from "../../../../lib/officesRepo";
import { getOfficeModules } from "../../../../lib/modulesRepo";
import { query, queryOne } from "@/lib/postgres";
import { authDebug } from "@/lib/authDebug";
import { getRoleBranding } from "@/lib/roleBranding";

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

    if (payload.role === "Student") {
      const student = await queryOne(`
        SELECT 
          sa.id AS account_id,
          sa.student_no,
          sa.email, 
          sa.first_name, 
          sa.middle_name, 
          sa.last_name, 
          sa.client_type,
          sa.avatar_filename,
          sa.status AS account_status,
          s.name, 
          s.status AS student_status, 
          s.course_code, 
          s.year_level, 
          s.section
        FROM student_accounts sa
        LEFT JOIN students s ON s.student_no = sa.student_no
        WHERE (sa.id = $1 AND $1 IS NOT NULL)
           OR (lower(sa.email) = lower($2) AND $2 IS NOT NULL)
           OR (sa.student_no IS NOT NULL AND upper(sa.student_no) = upper($3) AND $3 IS NOT NULL)
        LIMIT 1
      `, [payload.account_id || (Number.isFinite(Number(userId)) ? Number(userId) : null), payload.email || payload.username || null, payload.student_no || null]);

      if (!student) return addSecurityHeaders(NextResponse.json({ ok: false, error: "Student account not found" }, { status: 401 }));

      let fname = student.first_name || "";
      let lname = student.last_name || "";
      let mname = student.middle_name || "";
      if (!fname && !lname && student.name) {
        if (student.name.includes(",")) {
          const parts = student.name.split(",");
          lname = (parts[0] || "").trim();
          const firstPart = (parts[1] || "").trim();
          const nameTokens = firstPart.split(" ");
          if (nameTokens.length > 1 && nameTokens[nameTokens.length - 1].length <= 2) {
            mname = nameTokens.pop();
          }
          fname = nameTokens.join(" ");
        } else {
          const tokens = student.name.trim().split(" ");
          if (tokens.length > 1) {
            lname = tokens.pop();
            fname = tokens.join(" ");
          } else {
            fname = student.name;
          }
        }
      }

      const clientType = student.client_type || (student.course_code === "ALUMNI" ? "Alumni" : "Student");

      return addSecurityHeaders(NextResponse.json({
        ok: true,
        data: {
          id: student.student_no || String(student.account_id),
          account_id: student.account_id,
          role: "Student",
          status: student.account_status || student.student_status || "Active",
          student_no: student.student_no || "",
          name: [fname, lname].filter(Boolean).join(" ") || student.name || student.email || "",
          fname,
          lname,
          mname,
          email: student.email || "",
          username: student.email || student.student_no || "",
          client_type: clientType,
          course_code: student.course_code || "",
          year_level: student.year_level || null,
          section: student.section || "",
          avatar_filename: student.avatar_filename || null,
          enabled_modules: [],
          preferences: { theme: "light", navigation_layout: "sidebar" },
        },
      }));
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
    let stationName = null;
    let storagePath = null;
    let inboundPath = null;
    let scannerModel = null;

    if (staff && staff.office_id) {
      const office = process.env.DATABASE_URL
        ? await queryOne("SELECT * FROM offices WHERE id = $1", [staff.office_id])
        : await getOfficeById(staff.office_id);
      if (office) {
        officeName = office.name;
        accentColor = office.accent_color || "#800000";
        stationName = office.station_name || `${staff.office_id.toUpperCase()}-STATION-01`;
        storagePath = office.storage_path || `.local/storage/${staff.office_id}/uploads`;
        inboundPath = office.inbound_path || ".local/hot-folder/INBOUND";
        scannerModel = office.scanner_model || "High-Speed Document Scanner";
        const modules = process.env.DATABASE_URL
          ? await query("SELECT m.* FROM modules m JOIN office_modules om ON om.module_id = m.id WHERE om.office_id = $1 AND om.enabled = true", [staff.office_id])
          : await getOfficeModules(staff.office_id);
        enabledModules = (modules || []).map(m => m.id);
      }
    } else if (currentRole === "SuperAdmin") {
      officeName = "Super Administration";
      accentColor = "#000000";
      // SuperAdmin has access to everything
      const allModules = process.env.DATABASE_URL
        ? await query("SELECT id FROM modules")
        : await listAllModules();
      enabledModules = (allModules || []).map(m => m.id);
    }

    // Office accent colors are contextual branding, not user-editable theme data.
    accentColor = getRoleBranding({
      role: currentRole,
      officeId: staff?.office_id,
      officeName,
    }).color;

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
        station_name: stationName,
        storage_path: storagePath,
        inbound_path: inboundPath,
        scanner_model: scannerModel,
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

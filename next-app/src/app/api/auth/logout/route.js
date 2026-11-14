import { NextResponse } from "next/server";
import { getSessionCookieName, getRefreshCookieName } from "../../../../lib/jwt";
import { getLogoutPayload } from "@/lib/refreshSessions";
import { getStudentAuditName, writeAuditLog } from "../../../../lib/auditLogRequest";
import { authDebug } from "@/lib/authDebug";
import { revokeSession } from "@/lib/authSessions";
import { isAllowedOrigin } from "@/lib/csrfProtection";
import { shouldUseSecureCookie, clearAuthCookies } from "@/lib/cookieSecurity";
import { getStaffById, getStaffFullName } from "@/lib/staffRepo";

export const runtime = "nodejs";

function addSecurityHeaders(response) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export async function POST(req) {
  if (!isAllowedOrigin(req)) {
    return addSecurityHeaders(NextResponse.json({ ok: false, error: "Cross-origin request forbidden" }, { status: 403 }));
  }

  const sessionName = getSessionCookieName();
  const payload = await getLogoutPayload(req);
  if (payload?.jti) {
    await revokeSession(payload.jti, { principalId: payload.sub, reason: "logout" });
  }

  if (payload) {
    // Signing out ends this browser session only. It must not deactivate the
    // personnel account itself; otherwise the next valid login is redirected
    // away by AuthGuard as an inactive user.
    try {
      const userId = payload?.sub;
      const username = payload?.username;

      const isStudent = String(payload?.role || "").toLowerCase() === "student" || payload?.principal_type === "student";

      if (isStudent) {
        const studentIdentifier = payload?.student_no || username || userId;
        const studentName = await getStudentAuditName(payload?.account_id || userId, payload?.student_no);
        await writeAuditLog(req, `Student Logout`, {
          details: `student '${studentName || studentIdentifier}' successfully terminated system session and secure credentials`,
          actor: studentName || studentIdentifier,
          actor_id: payload?.student_no || payload?.account_id || userId,
          role: "Student",
          entity_type: "student_account",
          entity_id: studentIdentifier,
        });
      } else if (userId && userId !== "admin") {
        authDebug("logout.session_ended", { staffId: userId });
        const staff = await getStaffById(userId).catch(() => null);
        const staffName = staff ? getStaffFullName(staff) : userId;
        await writeAuditLog(req, `User Logout`, { 
          details: `personnel '${staffName}' successfully terminated system session and secure credentials`,
          actor_id: userId,
          role: payload?.role || "Staff",
          officeId: payload?.office_id || null,
          entity_type: "User",
          entity_id: userId,
        });
      } else if (userId === "admin") {
        await writeAuditLog(req, `User Logout`, { 
          details: `administrator session terminated and secure credentials purged from secure browser store`,
          actor: username || "admin",
          role: "Admin",
          entity_type: "User",
          entity_id: "admin",
        });
      }
    } catch {
      // Audit failure must not prevent clearing a revoked browser session.
    }
  }

  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res, req);
  return addSecurityHeaders(res);
}

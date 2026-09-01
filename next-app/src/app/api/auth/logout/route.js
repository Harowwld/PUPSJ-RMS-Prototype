import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { removeSession } from "../../../../lib/sessionStore";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { authDebug } from "@/lib/authDebug";

export const runtime = "nodejs";

function addSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export async function POST(req) {
  const sessionName = getSessionCookieName();
  const token = req.cookies.get(sessionName)?.value;

  if (token) {
    removeSession(token);
    // Signing out ends this browser session only. It must not deactivate the
    // personnel account itself; otherwise the next valid login is redirected
    // away by AuthGuard as an inactive user.
    try {
      const payload = await verifySessionToken(token);
      const userId = payload?.sub;
      const username = payload?.username;

      if (userId && userId !== "admin") {
        authDebug("logout.session_ended", { staffId: userId });
        await writeAuditLog(req, `User Logout`, { 
          details: `personnel '${username || userId}' successfully terminated system session and secure credentials`,
          entity_type: "User",
          entity_id: userId
        });
      } else if (userId === "admin") {
        await writeAuditLog(req, `User Logout`, { 
          details: `administrator session terminated and secure credentials purged from secure browser store`,
          actor: username || "admin",
          role: "Admin",
          entity_type: "User",
          entity_id: "admin"
        });
      }
    } catch {
      // Ignore token verification errors
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: sessionName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0), // Ensure immediate expiration
  });
  
  return addSecurityHeaders(res);
}

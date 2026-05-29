import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { removeSession } from "../../../../lib/sessionStore";
import { setStaffStatus } from "../../../../lib/staffRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

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
    // Verify token and set user status to Inactive
    try {
      const payload = await verifySessionToken(token);
      const userId = payload?.sub;
      const username = payload?.username;

      if (userId && userId !== "admin") {
        await setStaffStatus(userId, "Inactive");
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


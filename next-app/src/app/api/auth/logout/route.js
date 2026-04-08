import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { removeSession } from "../../../../lib/sessionStore";
import { setStaffStatus } from "../../../../lib/staffRepo";
import { broadcastToAdmins } from "../../../../pages/api/socket";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req) {
  // Get the session cookie to remove from store and set status
  const cookieHeader = req.headers.get("cookie");
  const sessionName = getSessionCookieName();
  const token = cookieHeader
    ?.split(";")
    .find((c) => c.trim().startsWith(`${sessionName}=`))
    ?.split("=")[1];

  if (token) {
    removeSession(token);
    // Verify token and set user status to Inactive
    try {
      const payload = await verifySessionToken(token);
      const userId = payload?.sub;
      const username = payload?.username;

      if (userId && userId !== "admin") {
        await setStaffStatus(userId, "Inactive");
        await writeAuditLog(req, `User logout: ${username || userId}`);
        // Broadcast to admins
        broadcastToAdmins("staffLogout", {
          staffId: userId,
          status: "Inactive",
        });
      } else if (userId === "admin") {
        await writeAuditLog(req, `User logout: ${username || "admin"}`, {
          actor: username || "admin",
          role: "Admin",
        });
        // Broadcast admin logout too
        broadcastToAdmins("staffLogout", {
          staffId: "admin",
          status: "Inactive",
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
  });
  return res;
}

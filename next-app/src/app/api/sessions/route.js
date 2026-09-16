import { NextResponse } from "next/server";
import {
  getActiveSessionCount,
  getActiveSessions,
} from "../../../lib/sessionStore";
import { requireSystemAdmin, createAuthErrorResponse } from "../../../lib/authHelpers";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);
  const count = await getActiveSessionCount();
  const sessions = await getActiveSessions();

  return NextResponse.json({
    ok: true,
    data: {
      count,
      sessions: sessions.map((s) => ({
        userId: s.userId,
        role: s.role,
        username: s.username,
        authLevel: s.authLevel,
        loginTime: s.loginTime,
        lastActivity: s.lastActivity,
        expiresAt: s.expiresAt,
      })),
    },
  });
}

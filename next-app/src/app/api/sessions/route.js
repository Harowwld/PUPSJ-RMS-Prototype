import { NextResponse } from "next/server";
import {
  getActiveSessionCount,
  getActiveSessions,
} from "../../../lib/sessionStore";

export const runtime = "nodejs";

export async function GET() {
  const count = getActiveSessionCount();
  const sessions = getActiveSessions();

  return NextResponse.json({
    ok: true,
    data: {
      count,
      sessions: sessions.map((s) => ({
        userId: s.userId,
        role: s.role,
        username: s.username,
      })),
    },
  });
}

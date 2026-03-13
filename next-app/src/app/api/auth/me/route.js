import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const cookieName = getSessionCookieName();
    const store = await cookies();
    const token = store.get(cookieName)?.value || "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifySessionToken(token);

    return NextResponse.json({
      ok: true,
      data: {
        id: payload.sub || null,
        role: payload.role || null,
        username: payload.username || null,
        mustChangePassword: Boolean(payload.mustChangePassword),
        last_active: payload.last_active || null,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }
}

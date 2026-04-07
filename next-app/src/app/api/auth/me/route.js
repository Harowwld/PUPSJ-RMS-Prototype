import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { getStaffById, hasAllSecurityAnswers } from "../../../../lib/staffRepo";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const cookieName = getSessionCookieName();
    const cookieStore = cookies();
    const store = (cookieStore instanceof Promise) ? await cookieStore : cookieStore;
    const token = store.get(cookieName)?.value || "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated: Missing token cookie" }, { status: 401 });
    }

    const payload = await verifySessionToken(token);
    const userId = payload.sub || null;

    // Fetch fresh user data from database to get current role and status
    const staff = userId ? await getStaffById(userId) : null;
    const currentRole = staff?.role || payload.role || null;
    const currentStatus = staff?.status || "Inactive";
    const hasSecurity = userId ? await hasAllSecurityAnswers(userId) : true;

    return NextResponse.json({
      ok: true,
      data: {
        id: userId,
        role: currentRole,
        status: currentStatus,
        username: payload.username || null,
        fname: staff?.fname || "",
        lname: staff?.lname || "",
        mustChangePassword: Boolean(payload.mustChangePassword),
        mustSetSecurityQuestions: !hasSecurity,
        last_active: payload.last_active || null,
      },
    });
  } catch (err) {
    console.error("[GET /api/auth/me Error]:", err);
    return NextResponse.json({ ok: false, error: "Invalid session: " + err.message }, { status: 401 });
  }
}

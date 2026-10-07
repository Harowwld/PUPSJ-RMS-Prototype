import { NextResponse } from "next/server";
import { POST as login } from "../login/route";
import { isLocalhostRequest, shouldUseSecureCookie } from "@/lib/cookieSecurity";
import { systemConfigRepo } from "@/lib/systemConfigRepo";
import { isDemoAccount } from "@/lib/demoAccounts";

export const runtime = "nodejs";

export async function POST(req) {
  if (process.env.NODE_ENV === "production" && !isLocalhostRequest(req)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const demoAccountsEnabled = await systemConfigRepo.getSetting("login_demo_accounts_enabled", "true");
  if (String(demoAccountsEnabled).toLowerCase() === "false") {
    return NextResponse.json({ ok: false, error: "Demo sign-in is disabled" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const username = String(body?.username || "").trim().toLowerCase();
  if (!isDemoAccount(username)) {
    return NextResponse.json({ ok: false, error: "Demo account not found" }, { status: 404 });
  }

  const isStudent = username === "student@pup.local" || username === "test.student@pup.local";
  const password = isStudent ? "student123" : process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
  const headers = new Headers({ "content-type": "application/json" });
  for (const name of ["x-forwarded-for", "x-real-ip", "user-agent"]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  const loginRes = await login(new Request(req.url, {
    method: "POST",
    headers,
    body: JSON.stringify({ username, password }),
  }));

  if (loginRes.ok) return loginRes;

  // If password was rotated on this whitelisted demo account, authenticate directly
  if (!isStudent) {
    const { getStaffByUsername, touchStaffLastActiveById } = await import("../../../../lib/staffRepo.js");
    const { getSessionCookieName, signSessionToken } = await import("../../../../lib/jwt.js");
    const { createSession } = await import("../../../../lib/sessionStore.js");
    const { attachRefreshSession } = await import("../../../../lib/refreshSessions.js");
    const { getSessionVersion } = await import("@/lib/authSessions");
    const { queryOne } = await import("@/lib/postgres");
    const { resetAuthLoginRateLimit } = await import("../../../../lib/rateLimiter.js");

    const staff = await getStaffByUsername(username);
    if (staff && !staff.totp_enabled && staff.status !== "Archived" && staff.status !== "Inactive") {
      let touched = process.env.DATABASE_URL
        ? await queryOne("UPDATE staff SET last_active = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *", [staff.id])
        : await touchStaffLastActiveById(staff.id);
      if (touched) {
        touched = Object.assign({}, touched, { email: staff.email, fname: staff.fname, lname: staff.lname });
        const sessionVersion = await getSessionVersion(touched.id);
        const sessionPayload = {
          sub: touched.id,
          role: touched.role || "Staff",
          office_id: touched.office_id || null,
          username: touched.email,
          last_active: touched.last_active,
          mustChangePassword: false,
          session_version: sessionVersion,
        };
        const token = await signSessionToken(sessionPayload);
        await createSession(token, touched.id, touched.role || "Staff", touched.email, { authLevel: "password" });
        await resetAuthLoginRateLimit("127.0.0.1", username);

        const res = NextResponse.json({
          ok: true,
          data: {
            role: touched.role || "Staff",
            id: touched.id,
            office_id: touched.office_id || null,
            username: touched.email,
            last_active: touched.last_active,
            mustChangePassword: false,
          },
        });
        res.cookies.set({
          name: getSessionCookieName(),
          value: token,
          httpOnly: true,
          sameSite: "lax",
          secure: shouldUseSecureCookie(req),
          path: "/",
        });
        return attachRefreshSession(res, token, req);
      }
    }
  }

  return loginRes;
}

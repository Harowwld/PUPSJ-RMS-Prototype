import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  setStaffPasswordById,
  verifyStaffPasswordById,
} from "../../../../lib/staffRepo";
import {
  getSessionCookieName,
  signSessionToken,
  verifySessionToken,
} from "../../../../lib/jwt";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { authDebug } from "@/lib/authDebug";

export const runtime = "nodejs";

export async function POST(req) {
  let session;
  try {
    const store = await cookies();
    const token = store.get(getSessionCookieName())?.value || "";
    if (!token) {
      authDebug("password_change.missing_session");
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }
    session = await verifySessionToken(token);
    authDebug("password_change.session_verified", { staffId: session?.sub || null, role: session?.role || null, officeId: session?.office_id || null });
  } catch {
    authDebug("password_change.invalid_session");
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    authDebug("password_change.invalid_body");
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const id = String(session?.sub || "").trim();
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (!id || !currentPassword || !newPassword) {
    authDebug("password_change.missing_fields", { staffId: id || null, hasCurrentPassword: Boolean(currentPassword), hasNewPassword: Boolean(newPassword) });
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (newPassword.length < 6) {
    authDebug("password_change.new_password_too_short", { staffId: id, length: newPassword.length });
    return NextResponse.json(
      { ok: false, error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const ok = await verifyStaffPasswordById(id, currentPassword);
  if (!ok) {
    authDebug("password_change.current_password_rejected", { staffId: id });
    return NextResponse.json(
      { ok: false, error: "Current password is incorrect" },
      { status: 401 }
    );
  }

  const updated = await setStaffPasswordById(id, newPassword);
  if (!updated) {
    authDebug("password_change.account_missing", { staffId: id });
    return NextResponse.json(
      { ok: false, error: "User not found" },
      { status: 404 }
    );
  }
  await writeAuditLog(req, `Rotate Password`, { 
    details: `personnel successfully rotated credentials for account ID '${id}'`,
    severity: "WARNING",
    entity_type: "User",
    entity_id: id
  });

  const nextPayload = {
    sub: session?.sub || id,
    role: session?.role || updated.role || "Staff",
    office_id: session?.office_id || updated.office_id || null,
    username: session?.username || updated.email || null,
    last_active: session?.last_active || updated.last_active || null,
    mustChangePassword: false,
  };
  const nextToken = await signSessionToken(nextPayload);
  authDebug("password_change.session_replaced", { staffId: nextPayload.sub, role: nextPayload.role, officeId: nextPayload.office_id, mustChangePassword: false });
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: getSessionCookieName(),
    value: nextToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}

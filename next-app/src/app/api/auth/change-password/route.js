import { NextResponse } from "next/server";
import {
  setStaffPasswordById,
  verifyStaffPasswordById,
} from "../../../../lib/staffRepo";
import {
  getSessionCookieName,
  signSessionToken,
} from "../../../../lib/jwt";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { authDebug } from "@/lib/authDebug";
import { requireAuth, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { bumpSessionVersion, getSessionVersion, registerSessionToken } from "@/lib/authSessions";
import { validatePasswordPolicy } from "@/lib/passwordPolicy";
import { setCSRFTokenCookie } from "@/lib/csrfProtection";

export const runtime = "nodejs";

export async function POST(req) {
  const access = await requireAuth(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  if (access.user.principalType !== "staff") return createAuthErrorResponse("Access denied", 403);
  const session = access.user.payload || {};
  authDebug("password_change.principal_resolved", { staffId: access.user.id, role: access.user.role, officeId: access.user.office_id || null });

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
  const isInitialSetup = Boolean(session?.mustChangePassword);

  if (!id || !newPassword || (!currentPassword && !isInitialSetup)) {
    authDebug("password_change.missing_fields", { staffId: id || null, hasCurrentPassword: Boolean(currentPassword), hasNewPassword: Boolean(newPassword), isInitialSetup });
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  const passwordPolicy = validatePasswordPolicy(newPassword);
  if (!passwordPolicy.valid) {
    authDebug("password_change.password_policy_rejected", { staffId: id, length: newPassword.length });
    return NextResponse.json(
      { ok: false, error: passwordPolicy.reason },
      { status: 400 }
    );
  }

  const defaultPassword = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
  if (isInitialSetup && newPassword === defaultPassword) {
    return NextResponse.json(
      { ok: false, error: "New password cannot be the same as the default password" },
      { status: 400 }
    );
  }

  // If initial setup and no currentPassword was provided, verify against the default password
  const passwordToCheck = currentPassword || (isInitialSetup ? defaultPassword : "");
  const ok = await verifyStaffPasswordById(id, passwordToCheck);
  if (!ok) {
    authDebug("password_change.current_password_rejected", { staffId: id, isInitialSetup });
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
  await bumpSessionVersion(id);
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
    session_version: await getSessionVersion(id),
  };
  const nextToken = await signSessionToken(nextPayload);
  await registerSessionToken(nextToken, {
    principalId: id,
    principalType: "staff",
    role: nextPayload.role,
    authLevel: "password-change",
  });
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
  return setCSRFTokenCookie(res, nextToken);
}

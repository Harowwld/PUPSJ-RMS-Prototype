import { NextResponse } from "next/server";
import {
  getStaffById,
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
import { shouldUseSecureCookie } from "@/lib/cookieSecurity";
import { query, queryOne } from "@/lib/postgres";

export const runtime = "nodejs";

export async function POST(req) {
  const access = await requireAuth(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(access.error || "Authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  }

  const isStaff = access.user.principalType === "staff" || access.user.role !== "Student";
  const session = access.user.payload || {};
  authDebug("password_change.principal_resolved", {
    userId: access.user.id,
    role: access.user.role,
    principalType: access.user.principalType,
  });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    authDebug("password_change.invalid_body");
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const id = String(session?.sub || access.user.id || "").trim();
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (!id || !newPassword) {
    authDebug("password_change.missing_fields", { id, hasNewPassword: Boolean(newPassword) });
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  const passwordPolicy = validatePasswordPolicy(newPassword);
  if (!passwordPolicy.valid) {
    authDebug("password_change.password_policy_rejected", { id, length: newPassword.length });
    return NextResponse.json(
      { ok: false, error: passwordPolicy.reason },
      { status: 400 }
    );
  }

  const defaultStaffPassword = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
  const knownDefaults = isStaff
    ? Array.from(new Set([defaultStaffPassword, "pupstaff"])).filter(Boolean)
    : ["student123", "pupstaff", defaultStaffPassword].filter(Boolean);

  if (knownDefaults.includes(newPassword)) {
    return NextResponse.json(
      { ok: false, error: "New password cannot be a default system password." },
      { status: 400 }
    );
  }

  if (isStaff) {
    const existingStaff = await getStaffById(id);
    if (!existingStaff) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    if (currentPassword) {
      const ok = await verifyStaffPasswordById(id, currentPassword);
      if (!ok) {
        authDebug("password_change.current_password_rejected", { staffId: id });
        return NextResponse.json(
          { ok: false, error: "Current password is incorrect" },
          { status: 401 }
        );
      }
    } else {
      // In initial setup or AccountSetupModal, verify against known default passwords
      let matchedDefault = false;
      for (const candidate of knownDefaults) {
        if (await verifyStaffPasswordById(id, candidate)) {
          matchedDefault = true;
          break;
        }
      }
      if (!matchedDefault && !session?.mustChangePassword) {
        return NextResponse.json(
          { ok: false, error: "Current password is required." },
          { status: 400 }
        );
      }
    }

    if (currentPassword && newPassword === currentPassword) {
      return NextResponse.json(
        { ok: false, error: "New password cannot be the same as your current password." },
        { status: 400 }
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
      authLevel: "password",
    });
    authDebug("password_change.session_replaced", { staffId: nextPayload.sub, role: nextPayload.role, mustChangePassword: false });
    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: getSessionCookieName(),
      value: nextToken,
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookie(req),
      path: "/",
    });
    return setCSRFTokenCookie(res, nextToken, req);
  } else {
    // Student password change
    const studentAccount = await queryOne(
      "SELECT id, password_hash FROM student_accounts WHERE id = $1 OR student_no = $1",
      [id]
    );
    if (!studentAccount) {
      return NextResponse.json({ ok: false, error: "Student account not found" }, { status: 404 });
    }

    if (currentPassword) {
      const { verifyPasswordHash } = await import("../../../../lib/passwordHash.js");
      const check = verifyPasswordHash(currentPassword, studentAccount.password_hash);
      if (!check.valid) {
        return NextResponse.json({ ok: false, error: "Current password is incorrect" }, { status: 401 });
      }
    }

    const { hashPassword } = await import("../../../../lib/passwordHash.js");
    await query(
      "UPDATE student_accounts SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [hashPassword(newPassword), studentAccount.id]
    );
    await bumpSessionVersion(id);

    const nextPayload = {
      ...session,
      sub: id,
      role: "Student",
      mustChangePassword: false,
      session_version: await getSessionVersion(id),
    };
    const nextToken = await signSessionToken(nextPayload);
    await registerSessionToken(nextToken, {
      principalId: id,
      principalType: "student",
      role: "Student",
      authLevel: "password",
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: getSessionCookieName(),
      value: nextToken,
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookie(req),
      path: "/",
    });
    return setCSRFTokenCookie(res, nextToken, req);
  }
}

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAuthErrorResponse, getPrincipalOfficeId, requireAdmin } from "@/lib/authHelpers";
import { assertAccountEmailConfigured, sendPasswordResetEmail } from "@/lib/accountEmail";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { isDemoAccount } from "@/lib/demoAccounts";
import { createPasswordResetUrl, getPasswordRecoveryOrigin } from "@/lib/passwordRecovery";
import { decryptPII } from "@/lib/piiEncryption";
import { query, transaction } from "@/lib/postgres";
import { checkAuthForgotPasswordRateLimit } from "@/lib/rateLimiter";
import { isSystemAdminRole, normalizeRole } from "@/lib/roleUtils";

export const runtime = "nodejs";

function failure(error, status) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req, { params }) {
  const access = await requireAdmin(req);
  if (!access.user) return createAuthErrorResponse(access.error, access.error?.startsWith("Access denied") ? 403 : 401);

  const { id } = await params;
  const actor = access.user;
  const global = isSystemAdminRole(actor.role);
  const officeId = getPrincipalOfficeId(actor);
  if ((!global && (normalizeRole(actor.role) !== "Admin" || !officeId)) || id === String(actor.id)) {
    return failure("You don’t have access to send a reset link for this account.", 403);
  }

  let origin;
  try {
    assertAccountEmailConfigured();
    origin = getPasswordRecoveryOrigin(req.url);
  } catch {
    return failure("Password reset email is unavailable. Check the email and application URL settings.", 503);
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  try {
    const limit = await checkAuthForgotPasswordRateLimit("staff-directory", `staff-reset:${actor.id}:${id}`);
    if (!limit.allowed) return failure("Too many reset emails were requested for this account. Try again later.", 429);

    const result = await transaction(async (tx) => {
      const account = await tx.queryOne(
        "SELECT id, role, status, office_id, email, fname, lname FROM staff WHERE id = $1 FOR UPDATE",
        [id],
      );
      const targetRole = normalizeRole(account?.role);
      if (!account || (global ? !["Admin", "Staff"].includes(targetRole) : targetRole !== "Staff" || account.office_id !== officeId)) {
        return { error: "Personnel account not found in your scope.", status: 404 };
      }
      if (account.status !== "Active") {
        return { error: "Restore this account before sending a password reset link.", status: 409 };
      }
      const email = decryptPII(account.email);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || isDemoAccount(email)) {
        return { error: "This account needs a registered, non-demo email address to receive a reset link.", status: 409 };
      }
      await tx.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE staff_id = $1 AND used_at IS NULL", [id]);
      await tx.query(
        `INSERT INTO password_reset_tokens (staff_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
        [id, tokenHash],
      );
      return { email, officeId: account.office_id, name: [decryptPII(account.fname), decryptPII(account.lname)].filter(Boolean).join(" ") };
    });
    if (result.error) return failure(result.error, result.status);

    try {
      await sendPasswordResetEmail({ to: result.email, fullName: result.name, resetUrl: createPasswordResetUrl(origin, token) });
    } catch {
      await query("UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL", [tokenHash]);
      return failure("Could not send the reset email. Check the email service and try again.", 502);
    }

    await writeGlobalAuditLog(req, "Personnel password reset email sent", {
      officeId: result.officeId,
      entity_type: "staff",
      entity_id: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Personnel password reset failed:", error?.code || error?.name);
    return failure("Could not complete the password reset request. Try again shortly.", 500);
  }
}

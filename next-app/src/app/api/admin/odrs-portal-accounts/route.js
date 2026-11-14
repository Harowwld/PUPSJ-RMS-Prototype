import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAuthErrorResponse, requireSystemAdmin } from "@/lib/authHelpers";
import { assertAccountEmailConfigured, sendPasswordResetEmail } from "@/lib/accountEmail";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { isDemoAccount } from "@/lib/demoAccounts";
import { listOdrsPortalAccounts } from "@/lib/odrsPortalAccountsRepo";
import { createPasswordResetUrl, getPasswordRecoveryOrigin } from "@/lib/passwordRecovery";
import { decryptPII } from "@/lib/piiEncryption";
import { query, transaction } from "@/lib/postgres";
import { checkAuthForgotPasswordRateLimit } from "@/lib/rateLimiter";

export const runtime = "nodejs";

const actions = {
  deactivate: "ODRS portal account deactivated",
  reactivate: "ODRS portal account reactivated",
  "send-reset": "ODRS password reset email sent",
};

function failure(error, status) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(req) {
  const access = await requireSystemAdmin(req);
  if (!access.user) return createAuthErrorResponse(access.error, access.error?.startsWith("Access denied") ? 403 : 401);

  try {
    return NextResponse.json({ ok: true, data: await listOdrsPortalAccounts() });
  } catch (error) {
    console.error("Failed to load ODRS portal accounts:", error?.code || error?.name);
    return failure("Unable to load portal accounts.", 500);
  }
}

export async function PATCH(req) {
  const access = await requireSystemAdmin(req);
  if (!access.user) return createAuthErrorResponse(access.error, access.error?.startsWith("Access denied") ? 403 : 401);

  const body = await req.json().catch(() => null);
  const id = body?.id;
  const action = body?.action;
  if (typeof id !== "string" || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)) ||
      typeof action !== "string" || !Object.hasOwn(actions, action)) {
    return failure("Choose a valid portal account and action.", 400);
  }

  try {
    if (action === "send-reset") {
      const problem = await sendPortalReset(req, id);
      if (problem) return problem;
    } else {
      const status = action === "deactivate" ? "Inactive" : "Active";
      const previous = action === "deactivate" ? "Active" : "Inactive";
      const changed = await transaction(async (tx) => {
        const account = await tx.queryOne(
          "UPDATE student_accounts SET status = $2, updated_at = NOW() WHERE id = $1 AND status = $3 RETURNING id",
          [id, status, previous],
        );
        if (!account) return false;
        if (action === "deactivate") {
          await tx.query(
            `UPDATE auth_sessions SET revoked_at = NOW(), revoked_reason = 'portal-account-deactivated'
              WHERE principal_id = $1 AND principal_type = 'student' AND revoked_at IS NULL`,
            [id],
          );
          await tx.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE student_account_id = $1 AND used_at IS NULL", [id]);
        }
        return true;
      });
      if (!changed) return failure("This account is no longer in the expected state. Refresh the list and try again.", 409);
    }

    await writeGlobalAuditLog(req, actions[action], { entity_type: "student_account", entity_id: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ODRS portal account action failed:", error?.code || error?.name);
    return failure("Could not complete the portal account action. Refresh the list before trying again.", 500);
  }
}

async function sendPortalReset(req, id) {
  let origin;
  try {
    assertAccountEmailConfigured();
    origin = getPasswordRecoveryOrigin(req.url);
  } catch {
    return failure("Password reset email is unavailable. Check the email and application URL settings.", 503);
  }

  const limit = await checkAuthForgotPasswordRateLimit("superadmin", `odrs-account:${id}`);
  if (!limit.allowed) return failure("Too many reset emails were requested for this account. Try again later.", 429);

  const token = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const recipient = await transaction(async (tx) => {
    const account = await tx.queryOne(
      `SELECT sip.email, sip.first_name, sip.last_name, sip.portal_email_verified_at
         FROM student_accounts sa
         JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
        WHERE sa.id = $1 AND sa.status = 'Active'
        FOR UPDATE OF sa, sip`,
      [id],
    );
    const email = account && decryptPII(account.email);
    if (!email || !account.portal_email_verified_at || isDemoAccount(email)) return null;

    await tx.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE student_account_id = $1 AND used_at IS NULL", [id]);
    await tx.query(
      `INSERT INTO password_reset_tokens (student_account_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
      [id, hash],
    );
    return { to: email, fullName: [decryptPII(account.first_name), decryptPII(account.last_name)].filter(Boolean).join(" ") };
  });
  if (!recipient) return failure("Password reset email requires an active account with a verified, non-demo email address.", 409);

  try {
    await sendPasswordResetEmail({ ...recipient, resetUrl: createPasswordResetUrl(origin, token) });
  } catch {
    await query("UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL", [hash]);
    return failure("The reset email could not be sent. Check the email service and try again.", 502);
  }
  return null;
}

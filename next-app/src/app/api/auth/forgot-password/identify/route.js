import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/postgres";
import { ForgotPasswordIdentifySchema } from "@/lib/authSchemas";
import { checkAuthForgotPasswordRateLimit } from "@/lib/rateLimiter";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { getStaffByUsername } from "@/lib/staffRepo";
import { findActiveStudentAccount } from "@/lib/studentAuth";
import { isDemoAccount } from "@/lib/demoAccounts";
import { assertAccountEmailConfigured, sendPasswordResetEmail } from "@/lib/accountEmail";
import { createPasswordResetUrl, getPasswordRecoveryOrigin } from "@/lib/passwordRecovery";

export const runtime = "nodejs";

function addSecurityHeaders(response) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

function genericResponse() {
  return addSecurityHeaders(NextResponse.json({
    ok: true,
    data: {
      message: "If an active account matches and delivery succeeds, check its registered email for a password reset link.",
    },
  }));
}

function getIpAddress(req) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")?.trim()
    || req.ip
    || "unknown";
}

export async function POST(req) {
  const ipAddress = getIpAddress(req);
  const ipLimit = await checkAuthForgotPasswordRateLimit(ipAddress);
  if (!ipLimit.allowed) {
    return addSecurityHeaders(NextResponse.json(
      { ok: false, error: "Too many password reset attempts. Please try again later." },
      { status: 429 },
    ));
  }

  const body = await req.json().catch(() => null);
  const validation = ForgotPasswordIdentifySchema.safeParse(body);
  if (!validation.success) {
    return addSecurityHeaders(NextResponse.json(
      { ok: false, error: "Invalid account identifier." },
      { status: 400 },
    ));
  }

  const identifier = validation.data.identifier.toLowerCase();
  const accountLimit = await checkAuthForgotPasswordRateLimit(ipAddress, identifier);
  if (!accountLimit.allowed) {
    return addSecurityHeaders(NextResponse.json(
      { ok: false, error: "Too many password reset attempts. Please try again later." },
      { status: 429 },
    ));
  }

  let recoveryOrigin;
  try {
    assertAccountEmailConfigured();
    recoveryOrigin = getPasswordRecoveryOrigin(req.url);
  } catch {
    return addSecurityHeaders(NextResponse.json(
      { ok: false, error: "Password recovery email is unavailable. Please contact your administrator." },
      { status: 503 },
    ));
  }

  const staff = await getStaffByUsername(identifier);
  const student = staff ? null : await findActiveStudentAccount(identifier);
  const account = staff || student;

  if (account?.email && !isDemoAccount(account.email) && (!staff || staff.status === "Active")) {
    const accountTable = staff ? "staff" : "student_accounts";
    const accountColumn = staff ? "staff_id" : "student_account_id";
    const resetToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    await transaction(async ({ query: txQuery }) => {
      await txQuery(`SELECT id FROM ${accountTable} WHERE id = $1 FOR UPDATE`, [account.id]);
      await txQuery(`UPDATE password_reset_tokens SET used_at = NOW() WHERE ${accountColumn} = $1 AND used_at IS NULL`, [account.id]);
      await txQuery(
        `INSERT INTO password_reset_tokens (${accountColumn}, token_hash, expires_at, requested_ip)
         VALUES ($1, $2, NOW() + INTERVAL '15 minutes', $3)`,
        [account.id, tokenHash, ipAddress],
      );
    });
    let delivered = false;
    try {
      await sendPasswordResetEmail({
        to: account.email,
        fullName: (staff ? [staff.fname, staff.lname] : [student.first_name, student.last_name]).filter(Boolean).join(" "),
        resetUrl: createPasswordResetUrl(recoveryOrigin, resetToken),
      });
      delivered = true;
    } catch {
      await query("UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL", [tokenHash]);
      // Provider errors can contain the message body and reset token.
      console.error("Password reset email delivery failed; the issued token was invalidated.");
    }
    if (delivered) await writeGlobalAuditLog(req, "Password reset requested", {
      actor: "System",
      role: "System",
      details: "A password reset transaction was created for an active account.",
      entity_type: "password_reset",
    });
  }

  // Keep account-present and account-absent responses indistinguishable to callers.
  await new Promise((resolve) => setTimeout(resolve, 250));
  return genericResponse();
}

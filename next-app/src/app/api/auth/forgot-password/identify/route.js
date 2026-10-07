import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/postgres";
import { ForgotPasswordIdentifySchema } from "@/lib/authSchemas";
import { checkAuthForgotPasswordRateLimit } from "@/lib/rateLimiter";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { getStaffByUsername } from "@/lib/staffRepo";
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

  let staff = await getStaffByUsername(identifier);
  if (staff && staff.status !== "Active") staff = null;

  if (staff) {
    const resetToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    await transaction(async ({ query: txQuery }) => {
      await txQuery("SELECT id FROM staff WHERE id = $1 FOR UPDATE", [staff.id]);
      await txQuery("UPDATE password_reset_tokens SET used_at = NOW() WHERE staff_id = $1 AND used_at IS NULL", [staff.id]);
      await txQuery(
        `INSERT INTO password_reset_tokens (staff_id, token_hash, expires_at, requested_ip)
         VALUES ($1, $2, NOW() + INTERVAL '15 minutes', $3)`,
        [staff.id, tokenHash, ipAddress],
      );
    });
    let delivered = false;
    try {
      await sendPasswordResetEmail({
        to: staff.email,
        fullName: [staff.fname, staff.lname].filter(Boolean).join(" "),
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
      details: "A password reset transaction was created for an active staff account.",
      entity_type: "password_reset",
    });
  }

  // Keep account-present and account-absent responses indistinguishable to callers.
  await new Promise((resolve) => setTimeout(resolve, 250));
  return genericResponse();
}

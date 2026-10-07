import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { transaction } from "@/lib/postgres";
import { ForgotPasswordResetSchema } from "@/lib/authSchemas";
import { hashPassword, verifyPasswordHash } from "@/lib/passwordHash";
import { checkAuthForgotPasswordRateLimit, resetAuthForgotPasswordRateLimit } from "@/lib/rateLimiter";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { bumpSessionVersion } from "@/lib/authSessions";
import { validatePasswordPolicy } from "@/lib/passwordPolicy";
import { decryptPII } from "@/lib/piiEncryption";

export const runtime = "nodejs";

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
    return NextResponse.json({ ok: false, error: "Too many password reset attempts. Please try again later." }, { status: 429 });
  }

  const validation = ForgotPasswordResetSchema.safeParse(await req.json().catch(() => null));
  if (!validation.success) {
    return NextResponse.json({ ok: false, error: "Invalid password reset request." }, { status: 400 });
  }

  const { resetToken, newPassword } = validation.data;
  const securityRecovery = !resetToken;
  const passwordPolicy = validatePasswordPolicy(newPassword);
  if (!passwordPolicy.valid) {
    return NextResponse.json({ ok: false, error: passwordPolicy.reason }, { status: 400 });
  }
  const tokenHash = securityRecovery ? null : crypto.createHash("sha256").update(resetToken).digest("hex");
  const recoveryKey = securityRecovery ? validation.data.id : tokenHash;
  const accountLimit = await checkAuthForgotPasswordRateLimit(ipAddress, recoveryKey);
  if (!accountLimit.allowed) {
    return NextResponse.json({ ok: false, error: "Too many password reset attempts. Please try again later." }, { status: 429 });
  }

  let staff;
  try {
    await transaction(async ({ query: txQuery, queryOne: txQueryOne }) => {
      if (securityRecovery) {
        const { id, questionId, answer } = validation.data;
        staff = await txQueryOne(
          "SELECT id, fname, lname, role, status FROM staff WHERE id = $1 FOR UPDATE",
          [id],
        );
        if (!staff || staff.status !== "Active") throw new Error("Invalid security question or answer.");
        const storedAnswer = await txQueryOne(
          "SELECT answer_hash FROM staff_security_answers WHERE staff_id = $1 AND question_id = $2 FOR UPDATE",
          [staff.id, questionId],
        );
        if (!storedAnswer || !verifyPasswordHash(answer.trim().toLowerCase(), storedAnswer.answer_hash).valid) {
          throw new Error("Invalid security question or answer.");
        }
        await txQuery(
          "UPDATE staff SET password_hash = $1, updated_at = NOW(), password_last_changed = NOW() WHERE id = $2",
          [hashPassword(newPassword), staff.id],
        );
        await txQuery("UPDATE password_reset_tokens SET used_at = NOW() WHERE staff_id = $1 AND used_at IS NULL", [staff.id]);
        return;
      }
      const resetRow = await txQueryOne(
        `SELECT id, staff_id FROM password_reset_tokens
          WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
        [tokenHash],
      );
      if (!resetRow) throw new Error("Invalid or expired password reset token.");

      staff = await txQueryOne(
        "SELECT id, fname, lname, role, status FROM staff WHERE id = $1 FOR UPDATE",
        [resetRow.staff_id],
      );
      if (!staff || staff.status !== "Active") throw new Error("Invalid or expired password reset token.");
      const lockedResetRow = await txQueryOne(
        `SELECT id FROM password_reset_tokens
          WHERE id = $1 AND staff_id = $2 AND used_at IS NULL AND expires_at > NOW()
          FOR UPDATE`,
        [resetRow.id, staff.id],
      );
      if (!lockedResetRow) throw new Error("Invalid or expired password reset token.");
      staff.fname = decryptPII(staff.fname);
      staff.lname = decryptPII(staff.lname);

      await txQuery(
        "UPDATE staff SET password_hash = $1, updated_at = NOW(), password_last_changed = NOW() WHERE id = $2",
        [hashPassword(newPassword), staff.id],
      );
      await txQuery(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1 AND used_at IS NULL",
        [resetRow.id],
      );
    });
  } catch (error) {
    const recoveryError = securityRecovery ? "Invalid security question or answer." : "Invalid or expired password reset token.";
    if (error.message !== recoveryError) throw error;
    return NextResponse.json({ ok: false, error: recoveryError }, { status: 400 });
  }

  await bumpSessionVersion(staff.id);
  await resetAuthForgotPasswordRateLimit(ipAddress, recoveryKey);
  await writeGlobalAuditLog(req, "Password reset completed", {
    actor: "System",
    role: "System",
    details: securityRecovery
      ? "A security question answer was verified and the account password was changed."
      : "A password reset token was consumed and the account password was changed.",
    entity_type: "password_reset",
    entity_id: staff.id,
  });

  return NextResponse.json({ ok: true, data: { success: true } });
}

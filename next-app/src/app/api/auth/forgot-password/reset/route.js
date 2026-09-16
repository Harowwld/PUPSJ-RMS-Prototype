import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { transaction } from "@/lib/postgres";
import { ForgotPasswordResetSchema } from "@/lib/authSchemas";
import { hashPassword } from "@/lib/passwordHash";
import { checkAuthForgotPasswordRateLimit, resetAuthForgotPasswordRateLimit } from "@/lib/rateLimiter";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { bumpSessionVersion } from "@/lib/authSessions";
import { validatePasswordPolicy } from "@/lib/passwordPolicy";

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
  const passwordPolicy = validatePasswordPolicy(newPassword);
  if (!passwordPolicy.valid) {
    return NextResponse.json({ ok: false, error: passwordPolicy.reason }, { status: 400 });
  }
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const accountLimit = await checkAuthForgotPasswordRateLimit(ipAddress, tokenHash);
  if (!accountLimit.allowed) {
    return NextResponse.json({ ok: false, error: "Too many password reset attempts. Please try again later." }, { status: 429 });
  }

  let staff;
  try {
    await transaction(async ({ query: txQuery, queryOne: txQueryOne }) => {
      const resetRow = await txQueryOne(
        `SELECT id, staff_id FROM password_reset_tokens
          WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
          FOR UPDATE`,
        [tokenHash],
      );
      if (!resetRow) throw new Error("Invalid or expired password reset token.");

      staff = await txQueryOne(
        "SELECT id, fname, lname, role, status FROM staff WHERE id = $1 FOR UPDATE",
        [resetRow.staff_id],
      );
      if (!staff || staff.status !== "Active") throw new Error("Invalid or expired password reset token.");
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
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid or expired password reset token." }, { status: 400 });
  }

  await bumpSessionVersion(staff.id);
  await resetAuthForgotPasswordRateLimit(ipAddress, tokenHash);
  await writeGlobalAuditLog(req, "Password reset completed", {
    actor: "System",
    role: "System",
    details: "A password reset token was consumed and the account password was changed.",
    entity_type: "password_reset",
    entity_id: staff.id,
  });

  return NextResponse.json({ ok: true, data: { success: true } });
}

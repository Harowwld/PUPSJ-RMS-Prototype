import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/postgres";
import { ForgotPasswordIdentifySchema } from "@/lib/authSchemas";
import { checkAuthForgotPasswordRateLimit } from "@/lib/rateLimiter";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { getStaffByUsername } from "@/lib/staffRepo";

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
      message: "If an active account matches, a password-reset link will be sent to its registered recovery channel.",
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

  let staff = await getStaffByUsername(identifier);
  if (staff && staff.status !== "Active") staff = null;

  if (staff) {
    const resetToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    await query("UPDATE password_reset_tokens SET used_at = NOW() WHERE staff_id = $1 AND used_at IS NULL", [staff.id]);
    await query(
      `INSERT INTO password_reset_tokens (staff_id, token_hash, expires_at, requested_ip)
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes', $3)`,
      [staff.id, tokenHash, ipAddress],
    );
    // Delivery is intentionally out-of-band. Never put resetToken in the response or logs.
    await writeGlobalAuditLog(req, "Password reset requested", {
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

import { NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  getStaffByUsername,
  setStaffPasswordById,
  verifyPasswordHash,
  touchStaffLastActiveById,
  getStaffDisplayName,
  hasAllSecurityAnswers,
} from "../../../../lib/staffRepo";
import { getSessionCookieName, signSessionToken } from "../../../../lib/jwt";
import { createSession } from "../../../../lib/sessionStore";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { checkAuthLoginRateLimit, resetAuthLoginRateLimit } from "../../../../lib/rateLimiter";
import { LoginSchema } from "../../../../lib/authSchemas";
import { query, queryOne } from "@/lib/postgres";
import { authDebug } from "@/lib/authDebug";
import { authenticateStudent, createStudentSession, setStudentSessionCookie } from "@/lib/studentAuth";
import { setCSRFTokenCookie } from "../../../../lib/csrfProtection";
import { getSessionVersion, registerSessionToken } from "@/lib/authSessions";

export const runtime = "nodejs";

async function audit(req, action, details, severity = "INFO") {
  if (!process.env.DATABASE_URL) {
    return writeAuditLog(req, action, { details, severity });
  }
  return query(
    "INSERT INTO global_audit_logs (actor, role, action, details, severity, ip, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    ["System", "System", action, details || "", severity, req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null, req.headers.get("user-agent") || null]
  );
}

function addSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

function rateLimitResponse(rateLimitResult) {
  if (rateLimitResult.allowed) return null;
  return addSecurityHeaders(NextResponse.json(
    {
      ok: false,
      error: rateLimitResult.reason === 'locked_out'
        ? `Account temporarily locked due to too many failed attempts. Please try again later.`
        : 'Too many login attempts. Please try again later.',
      retryAfter: rateLimitResult.resetTime ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000) : undefined
    },
    {
      status: 429,
      headers: rateLimitResult.resetTime ? {
        'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        'X-RateLimit-Limit': rateLimitResult.limit,
        'X-RateLimit-Remaining': Math.max(0, rateLimitResult.remaining || 0),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      } : {}
    }
  ));
}

export async function POST(req) {
  // 1. Check Rate Limit (Moved back to route handler from middleware)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                    realIP ? realIP.trim() : 
                    req.ip || 'unknown';

  const ipRateLimitResult = await checkAuthLoginRateLimit(ipAddress);
  authDebug("login.request", { rateLimitAllowed: ipRateLimitResult.allowed });
  const ipRateLimitResponse = rateLimitResponse(ipRateLimitResult);
  if (ipRateLimitResponse) return ipRateLimitResponse;

  // 2. Validate Input
  const body = await req.json().catch(() => null);
  const validation = LoginSchema.safeParse(body);
  
  if (!validation.success) {
    authDebug("login.invalid_input", { reason: validation.error.issues?.[0]?.message || "Invalid input" });
    const errorMsg = validation.error.issues?.[0]?.message || "Invalid input";
    return addSecurityHeaders(NextResponse.json(
      { ok: false, error: errorMsg },
      { status: 400 }
    ));
  }

  const { username, password, cfTurnstileResponse } = validation.data;

  // 3. Verify Turnstile Token
  const isTurnstileValid = await verifyTurnstileToken(cfTurnstileResponse);
  if (!isTurnstileValid) {
    authDebug("login.bot_detected", { reason: "Turnstile verification failed" });
    return addSecurityHeaders(NextResponse.json(
      { ok: false, error: "Bot verification failed. Please refresh the page and try again." },
      { status: 403 }
    ));
  }

  // 2. Authenticate
  const cleanUsername = String(username || "").trim();
  const rateLimitIdentifier = cleanUsername.toLowerCase();
  const accountRateLimitResult = await checkAuthLoginRateLimit(ipAddress, rateLimitIdentifier);
  const accountRateLimitResponse = rateLimitResponse(accountRateLimitResult);
  if (accountRateLimitResponse) return accountRateLimitResponse;
  const lowerUser = cleanUsername.toLowerCase();
  const isSuperAdminAlias = lowerUser === "admin.default@pup.local" || lowerUser === "pupregistrar-001";
  const searchIdentifier = isSuperAdminAlias ? "superadmin@pup.local" : cleanUsername;

  let staff = process.env.DATABASE_URL
    ? await queryOne(
        "SELECT * FROM staff WHERE lower(email) = lower($1) OR lower(id) = lower($1)",
        [searchIdentifier]
      )
    : await getStaffByUsername(searchIdentifier);

  if (!staff && isSuperAdminAlias) {
    staff = process.env.DATABASE_URL
      ? await queryOne(
          "SELECT * FROM staff WHERE lower(email) = lower($1) OR lower(id) = lower($1)",
          [cleanUsername]
        )
      : await getStaffByUsername(cleanUsername);
  }

  if (!staff) {
    // Check if it's a student trying to log in
    const student = await authenticateStudent({ studentNo: cleanUsername, password });
    if (student) {
      const token = await createStudentSession(student);
      await audit(req, "Student Login", `student '${student.student_no}' authenticated via main portal`);
      const studentRes = NextResponse.json({
        ok: true,
        data: {
          role: "Student",
          id: student.student_no,
          student_no: student.student_no,
          username: student.student_no,
          name: student.name,
        },
      });
      return addSecurityHeaders(setStudentSessionCookie(studentRes, token));
    }

    authDebug("login.account_missing", { identifierLength: cleanUsername.length });
    await audit(req, "Login Attempt", `authentication failure: identifier '${cleanUsername}' not recognized by the system repository`, "WARNING");
    return addSecurityHeaders(NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 }));
  }

  if (staff.status === "Archived" || staff.status === "Inactive") {
    authDebug("login.account_archived", { staffId: staff.id });
    await audit(req, "Login Attempt", `authentication failure: attempt to access personnel account '${username}' which is currently archived and disabled`, "CRITICAL");
    return addSecurityHeaders(NextResponse.json(
      { ok: false, error: "This account has been archived. Please contact an administrator." },
      { status: 403 }
    ));
  }

  const stored = staff.password_hash;
  if (!stored) {
    authDebug("login.password_not_configured", { staffId: staff.id });
    return addSecurityHeaders(NextResponse.json({ ok: false, error: "Account has no password" }, { status: 401 }));
  }

  const passwordVerification = verifyPasswordHash(password, stored);
  if (!passwordVerification.valid) {
    authDebug("login.password_rejected", { staffId: staff.id, status: staff.status });
    await audit(req, "Login Attempt", `authentication failure: invalid credentials provided for recognized account '${username}'`, "WARNING");
    return addSecurityHeaders(NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 }));
  }

  if (passwordVerification.needsRehash) {
    await setStaffPasswordById(staff.id, password);
  }

  // 3. Create Session or Require 2FA
  const touched = process.env.DATABASE_URL
    ? await queryOne("UPDATE staff SET last_active = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *", [staff.id])
    : await touchStaffLastActiveById(staff.id);
  if (!touched) {
    authDebug("login.last_active_update_failed", { staffId: staff.id });
    return addSecurityHeaders(NextResponse.json(
      { ok: false, error: "Failed to update last active" },
      { status: 500 }
    ));
  }
  const sessionVersion = await getSessionVersion(touched.id);

  // Check if 2FA is enabled
  if (touched.totp_enabled) {
    authDebug("login.requires_totp", { staffId: touched.id, role: touched.role, officeId: touched.office_id || null });
    // Generate a temporary token for 2FA verification
    const tempPayload = {
      sub: touched.id,
      purpose: "2fa",
      role: touched.role || "Staff",
      office_id: touched.office_id || null,
      username: touched.email,
      session_version: sessionVersion,
    };
    // Sign with a short expiry (e.g., 5 minutes)
    const tempToken = await signSessionToken(tempPayload, "5m");
    await registerSessionToken(tempToken, {
      principalId: touched.id,
      principalType: "staff",
      role: touched.role || "Staff",
      username: touched.email,
      authLevel: "2fa-challenge",
    });
    
    return addSecurityHeaders(NextResponse.json({
      ok: true,
      data: {
        totpRequired: true,
        tempToken,
        username: touched.email,
      },
    }));
  }

  const defaultPassword = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
  const hasSecurity = await hasAllSecurityAnswers(touched.id);
  const mustChangePassword = ((password === defaultPassword) || verifyPasswordHash(defaultPassword, touched.password_hash).valid) && !hasSecurity;
  authDebug("login.session_issued", {
    staffId: touched.id,
    role: touched.role || "Staff",
    officeId: touched.office_id || null,
    mustChangePassword,
  });

  const sessionPayload = {
    sub: touched.id,
    role: touched.role || "Staff",
    office_id: touched.office_id || null,
    username: touched.email,
    last_active: touched.last_active,
    mustChangePassword,
    session_version: sessionVersion,
  };
  const token = await signSessionToken(sessionPayload);
  await createSession(token, touched.id, touched.role || "Staff", touched.email, { authLevel: "password" });
  
  // Reset login rate limit on full successful login
  await resetAuthLoginRateLimit(ipAddress, rateLimitIdentifier);

  await audit(req, "User Login", `personnel '${getStaffDisplayName(touched)}' successfully authenticated into the system repository`);

  const res = NextResponse.json({
    ok: true,
    data: {
      role: touched.role || "Staff",
      id: touched.id,
      office_id: touched.office_id || null,
      username: touched.email,
      last_active: touched.last_active,
      mustChangePassword,
    },
  });

  res.cookies.set({
    name: getSessionCookieName(),
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return addSecurityHeaders(setCSRFTokenCookie(res, token));
}

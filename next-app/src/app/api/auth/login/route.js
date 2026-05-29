import { NextResponse } from "next/server";
import {
  getStaffByUsername,
  hashPasswordForStorage,
  touchStaffLastActiveById,
  getStaffDisplayName,
} from "../../../../lib/staffRepo";
import { getSessionCookieName, signSessionToken } from "../../../../lib/jwt";
import { createSession } from "../../../../lib/sessionStore";
import { broadcastToAdmins } from "../../../../pages/api/socket";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { checkAuthLoginRateLimit, resetAuthLoginRateLimit } from "../../../../lib/rateLimiter";
import { LoginSchema } from "../../../../lib/authSchemas";

export const runtime = "nodejs";

function addSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export async function POST(req) {
  // 1. Check Rate Limit (Moved back to route handler from middleware)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                    realIP ? realIP.trim() : 
                    req.ip || 'unknown';

  const rateLimitResult = await checkAuthLoginRateLimit(ipAddress);
  if (!rateLimitResult.allowed) {
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

  // 2. Validate Input
  const body = await req.json().catch(() => null);
  const validation = LoginSchema.safeParse(body);
  
  if (!validation.success) {
    const errorMsg = validation.error.errors[0]?.message || "Invalid input";
    return addSecurityHeaders(NextResponse.json(
      { ok: false, error: errorMsg },
      { status: 400 }
    ));
  }

  const { username, password } = validation.data;

  // 2. Authenticate
  const staff = await getStaffByUsername(username);
  if (!staff) {
    await writeAuditLog(req, `Login Attempt`, { 
      details: `authentication failure: identifier '${username}' not recognized by the system repository`, 
      actor: username,
      role: "Guest",
      severity: "WARNING"
    });
    return addSecurityHeaders(NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 }));
  }

  if (staff.status === "Archived") {
    await writeAuditLog(req, `Login Attempt`, { 
      details: `authentication failure: attempt to access personnel account '${username}' which is currently archived and disabled`, 
      actor: username,
      role: "Guest",
      severity: "CRITICAL"
    });
    return addSecurityHeaders(NextResponse.json(
      { ok: false, error: "This account has been archived. Please contact an administrator." },
      { status: 403 }
    ));
  }

  const stored = staff.password_hash;
  if (!stored) {
    return addSecurityHeaders(NextResponse.json({ ok: false, error: "Account has no password" }, { status: 401 }));
  }

  const hashed = hashPasswordForStorage(password);
  if (hashed !== stored) {
    await writeAuditLog(req, `Login Attempt`, { 
      details: `authentication failure: invalid credentials provided for recognized account '${username}'`, 
      actor: username,
      role: "Guest",
      severity: "WARNING"
    });
    return addSecurityHeaders(NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 }));
  }

  // 3. Create Session or Require 2FA
  const touched = await touchStaffLastActiveById(staff.id);
  if (!touched) {
    return addSecurityHeaders(NextResponse.json(
      { ok: false, error: "Failed to update last active" },
      { status: 500 }
    ));
  }

  // Check if 2FA is enabled
  if (touched.totp_enabled) {
    // Reset login rate limit as they successfully provided correct password
    await resetAuthLoginRateLimit(ipAddress);

    // Generate a temporary token for 2FA verification
    const tempPayload = {
      sub: touched.id,
      purpose: "2fa",
      role: touched.role || "Staff",
      username: touched.email,
    };
    // Sign with a short expiry (e.g., 5 minutes)
    const tempToken = await signSessionToken(tempPayload, "5m");
    
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
  const defaultHash = hashPasswordForStorage(defaultPassword);
  const mustChangePassword = stored === defaultHash;

  const sessionPayload = {
    sub: touched.id,
    role: touched.role || "Staff",
    username: touched.email,
    last_active: touched.last_active,
    mustChangePassword,
  };
  const token = await signSessionToken(sessionPayload);
  createSession(token, touched.id, touched.role || "Staff", touched.email);
  
  // Reset login rate limit on full successful login
  await resetAuthLoginRateLimit(ipAddress);

  await writeAuditLog(req, `User Login`, { 
    details: `personnel '${getStaffDisplayName(touched)}' successfully authenticated into the system repository`, 
    actor: getStaffDisplayName(touched),
    role: touched.role || "Staff",
    entity_type: "User",
    entity_id: touched.id
  });

  // Broadcast to admins
  broadcastToAdmins("staffLogin", {
    staffId: touched.id,
    role: touched.role || "Staff",
    username: touched.email,
    status: "Active",
    last_active: touched.last_active,
  });

  const res = NextResponse.json({
    ok: true,
    data: {
      role: touched.role || "Staff",
      id: touched.id,
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

  return addSecurityHeaders(res);
}


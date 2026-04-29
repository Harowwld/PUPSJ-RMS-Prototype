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
import { checkAuthLoginRateLimit } from "../../../../lib/rateLimiter";

export const runtime = "nodejs";

export async function POST(req) {
  // Get client IP for rate limiting
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                    realIP ? realIP.trim() : 
                    req.ip || 'unknown';

  // Check rate limit
  const rateLimitResult = await checkAuthLoginRateLimit(ipAddress);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
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
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    await writeAuditLog(req, "Login attempt failed: missing credentials", {
      actor: username || "Unknown",
      role: "Guest",
    });
    return NextResponse.json(
      { ok: false, error: "Missing credentials" },
      { status: 400 }
    );
  }

  const staff = await getStaffByUsername(username);
  if (!staff) {
    await writeAuditLog(req, `Login attempt failed: unknown user (${username})`, {
      actor: username,
      role: "Guest",
    });
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const stored = staff.password_hash;
  if (!stored) {
    return NextResponse.json({ ok: false, error: "Account has no password" }, { status: 401 });
  }

  const hashed = hashPasswordForStorage(password);
  if (hashed !== stored) {
    await writeAuditLog(req, `Login attempt failed: invalid password (${username})`, {
      actor: username,
      role: "Guest",
    });
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const touched = await touchStaffLastActiveById(staff.id);
  if (!touched) {
    return NextResponse.json(
      { ok: false, error: "Failed to update last active" },
      { status: 500 }
    );
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
  await writeAuditLog(req, `User login: ${touched.email || touched.id}`, {
    actor: getStaffDisplayName(touched),
    role: touched.role || "Staff",
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
  return res;
}

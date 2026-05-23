import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { 
  getStaffById, 
  verifyRecoveryCode, 
  getStaffDisplayName, 
  hashPasswordForStorage,
  verifySerialKey
} from "@/lib/staffRepo";
import { getSessionCookieName, verifySessionToken, signSessionToken } from "@/lib/jwt";
import { verifyTOTP, decryptSecret } from "@/lib/totp";
import { createSession } from "@/lib/sessionStore";
import { broadcastToAdmins } from "@/pages/api/socket";
import { writeAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

function addSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || !body.tempToken || !body.code) {
    return addSecurityHeaders(NextResponse.json({ ok: false, error: "Missing verification data" }, { status: 400 }));
  }

  const { tempToken, code } = body;

  // 1. Verify Temp Token
  let payload;
  try {
    payload = await verifySessionToken(tempToken);
    if (payload.purpose !== "2fa") {
      throw new Error("Invalid token purpose");
    }
  } catch (err) {
    return addSecurityHeaders(NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 }));
  }

  const userId = payload.sub;
  const staff = await getStaffById(userId);
  if (!staff) {
    return addSecurityHeaders(NextResponse.json({ ok: false, error: "User not found" }, { status: 404 }));
  }

  let isValid = false;
  let methodUsed = "";

  // 2. Try TOTP (6 digits)
  if (/^\d{6}$/.test(code.trim())) {
    const decrypted = decryptSecret(staff.totp_secret);
    if (decrypted) {
      isValid = verifyTOTP(code, decrypted);
      methodUsed = "TOTP";
    }
  }

  // 3. Try Recovery Code (8 chars) if not valid TOTP
  if (!isValid && code.trim().length === 8) {
    isValid = await verifyRecoveryCode(userId, code);
    methodUsed = "Recovery Code";
  }

  // 4. Try Serial Key (16 or 19 chars) if not valid yet
  if (!isValid && (code.trim().length === 16 || code.trim().length === 19)) {
    isValid = await verifySerialKey(userId, code);
    methodUsed = "Serial Key";
  }

  if (!isValid) {
    await writeAuditLog(req, `2FA Verification Failure`, { 
      details: `failed 2FA verification attempt for personnel '${getStaffDisplayName(staff)}'`, 
      actor: getStaffDisplayName(staff),
      role: staff.role || "Staff",
      severity: "WARNING",
      entity_type: "User",
      entity_id: staff.id
    });
    return addSecurityHeaders(NextResponse.json({ ok: false, error: "Invalid verification code" }, { status: 401 }));
  }

  // 4. Verification Successful -> Create Full Session
  const defaultPassword = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
  const defaultHash = hashPasswordForStorage(defaultPassword);
  const mustChangePassword = staff.password_hash === defaultHash;

  const sessionPayload = {
    sub: staff.id,
    role: staff.role || "Staff",
    username: staff.email,
    last_active: staff.last_active,
    mustChangePassword,
  };
  const token = await signSessionToken(sessionPayload);
  createSession(token, staff.id, staff.role || "Staff", staff.email);
  
  await writeAuditLog(req, `User Login (2FA)`, { 
    details: `personnel '${getStaffDisplayName(staff)}' successfully verified via ${methodUsed} and authenticated`, 
    actor: getStaffDisplayName(staff),
    role: staff.role || "Staff",
    entity_type: "User",
    entity_id: staff.id
  });

  // Broadcast to admins
  broadcastToAdmins("staffLogin", {
    staffId: staff.id,
    role: staff.role || "Staff",
    username: staff.email,
    status: "Active",
    last_active: staff.last_active,
  });

  const res = NextResponse.json({
    ok: true,
    data: {
      role: staff.role || "Staff",
      id: staff.id,
      username: staff.email,
      last_active: staff.last_active,
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

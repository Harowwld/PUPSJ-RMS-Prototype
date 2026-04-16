import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { getStaffById } from "../../../../lib/staffRepo";
import { dbGet, dbRun } from "../../../../lib/sqlite";
import {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
  encryptSecret,
  decryptSecret,
  isValidToken,
} from "../../../../lib/totp";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

export const runtime = "nodejs";

async function getAuthenticatedUser(req) {
  const cookieStore = await cookies();
  const store = cookieStore instanceof Promise ? await cookieStore : cookieStore;
  const token = store.get(getSessionCookieName())?.value || "";
  if (!token) return null;
  try {
    const payload = await verifySessionToken(token);
    const userId = payload?.sub;
    if (!userId) return null;
    return { userId, payload };
  } catch {
    return null;
  }
}

export async function GET(req) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const staff = await getStaffById(user.userId);
  if (!staff) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      enabled: Boolean(staff.totp_enabled),
      hasSecret: Boolean(staff.totp_secret),
    },
  });
}

export async function POST(req) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action;

  if (action === "setup") {
    return handleSetup(req, user, body);
  } else if (action === "verify") {
    return handleVerify(req, user, body);
  } else if (action === "disable") {
    return handleDisable(req, user, body);
  } else if (action === "validate") {
    return handleValidate(req, user, body);
  }

  return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
}

async function handleSetup(req, user, body) {
  const staff = await getStaffById(user.userId);
  if (!staff) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  if (staff.totp_enabled) {
    return NextResponse.json({ ok: false, error: "TOTP already enabled" }, { status: 400 });
  }

  const { secret, otpauthUrl } = generateTOTPSecret(staff.email);
  console.log("[TOTP Setup] Generated secret:", secret);
  console.log("[TOTP Setup] OTPAuth URL:", otpauthUrl);
  const encrypted = encryptSecret(secret);
  console.log("[TOTP Setup] Encrypted secret:", encrypted);
  const qrDataUrl = await generateQRCode(otpauthUrl);

  await dbRun(
    "UPDATE staff SET totp_secret = ?, updated_at = datetime('now') WHERE id = ?",
    [encrypted, user.userId]
  );

  return NextResponse.json({
    ok: true,
    data: {
      secret,
      qrCode: qrDataUrl,
    },
  });
}

async function handleVerify(req, user, body) {
  const { token } = body;
  console.log("[TOTP Verify] User:", user.userId, "Token received:", token);
  if (!isValidToken(token)) {
    return NextResponse.json({ ok: false, error: "Invalid token format" }, { status: 400 });
  }

  const staff = await getStaffById(user.userId);
  if (!staff || !staff.totp_secret) {
    return NextResponse.json({ ok: false, error: "TOTP not initialized" }, { status: 400 });
  }

  const decrypted = decryptSecret(staff.totp_secret);
  console.log("[TOTP Verify] Decrypted secret:", decrypted ? "OK" : "FAILED");
  if (!decrypted) {
    return NextResponse.json({ ok: false, error: "Failed to decrypt TOTP secret" }, { status: 500 });
  }

  const isValid = verifyTOTP(token, decrypted);
  console.log("[TOTP Verify] Result:", isValid);
  if (!isValid) {
    return NextResponse.json({ ok: false, error: "Invalid verification code" }, { status: 401 });
  }

  await dbRun(
    "UPDATE staff SET totp_enabled = 1, updated_at = datetime('now') WHERE id = ?",
    [user.userId]
  );

  await writeAuditLog(req, "Enabled TOTP authentication", {
    actor: `${staff.fname} ${staff.lname}`,
    role: staff.role,
  });

  return NextResponse.json({ ok: true, data: { enabled: true } });
}

async function handleDisable(req, user, body) {
  const { token } = body;
  console.log("[TOTP Disable] User:", user.userId, "Token received:", token);
  if (!isValidToken(token)) {
    return NextResponse.json({ ok: false, error: "Invalid token format" }, { status: 400 });
  }

  const staff = await getStaffById(user.userId);
  if (!staff || !staff.totp_enabled) {
    return NextResponse.json({ ok: false, error: "TOTP not enabled" }, { status: 400 });
  }

  const decrypted = decryptSecret(staff.totp_secret);
  console.log("[TOTP Disable] Decrypted secret:", decrypted ? "OK" : "FAILED");
  if (!decrypted) {
    return NextResponse.json({ ok: false, error: "Failed to decrypt TOTP secret" }, { status: 500 });
  }

  const isValid = verifyTOTP(token, decrypted);
  console.log("[TOTP Disable] Result:", isValid);
  if (!isValid) {
    return NextResponse.json({ ok: false, error: "Invalid verification code" }, { status: 401 });
  }

  await dbRun(
    "UPDATE staff SET totp_secret = NULL, totp_enabled = 0, updated_at = datetime('now') WHERE id = ?",
    [user.userId]
  );

  await writeAuditLog(req, "Disabled TOTP authentication", {
    actor: `${staff.fname} ${staff.lname}`,
    role: staff.role,
  });

  return NextResponse.json({ ok: true, data: { enabled: false } });
}

async function handleValidate(req, user, body) {
  const { token } = body;
  console.log("[TOTP Validate] User:", user.userId, "Token received:", token);
  if (!isValidToken(token)) {
    return NextResponse.json({ ok: false, error: "Invalid token format" }, { status: 400 });
  }

  const staff = await getStaffById(user.userId);
  if (!staff || !staff.totp_enabled || !staff.totp_secret) {
    return NextResponse.json({ ok: false, error: "TOTP not configured" }, { status: 400 });
  }

  const decrypted = decryptSecret(staff.totp_secret);
  console.log("[TOTP Validate] Decrypted secret:", decrypted ? "OK" : "FAILED");
  if (!decrypted) {
    return NextResponse.json({ ok: false, error: "Failed to decrypt TOTP secret" }, { status: 500 });
  }

  const isValid = verifyTOTP(token, decrypted);
  console.log("[TOTP Validate] Result:", isValid);
  return NextResponse.json({ ok: isValid, data: { valid: isValid } });
}

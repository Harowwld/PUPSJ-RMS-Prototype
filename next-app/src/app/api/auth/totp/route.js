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
import { 
  getRecoveryCodesCount, 
  generateRecoveryCodes, 
  setSerialKey 
} from "../../../../lib/staffRepo";
import crypto from "node:crypto";
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
      recoveryCodesCount: await getRecoveryCodesCount(user.userId),
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
  } else if (action === "generate-recovery-codes") {
    return handleGenerateRecoveryCodes(req, user, body);
  } else if (action === "get-recovery-codes-status") {
    return handleGetRecoveryCodesStatus(req, user, body);
  } else if (action === "disable-recovery-codes") {
    return handleDisableRecoveryCodes(req, user, body);
  }

  return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
}

function generateSerialKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous O, 0, I, 1
  let key = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) key += "-";
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
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

  const serialKey = generateSerialKey();

  await dbRun(
    "UPDATE staff SET totp_secret = ?, updated_at = datetime('now') WHERE id = ?",
    [encrypted, user.userId]
  );
  
  await setSerialKey(user.userId, serialKey);

  return NextResponse.json({
    ok: true,
    data: {
      secret,
      qrCode: qrDataUrl,
      serialKey,
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

  const recoveryCodesCount = await getRecoveryCodesCount(user.userId);
  const nextTotpEnabled = recoveryCodesCount > 0 ? 1 : 0;

  await dbRun(
    "UPDATE staff SET totp_secret = NULL, totp_enabled = ?, updated_at = datetime('now') WHERE id = ?",
    [nextTotpEnabled, user.userId]
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

async function handleGenerateRecoveryCodes(req, user, body) {
  const staff = await getStaffById(user.userId);
  if (!staff) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const codes = await generateRecoveryCodes(user.userId);

  await dbRun(
    "UPDATE staff SET totp_enabled = 1, updated_at = datetime('now') WHERE id = ?",
    [user.userId]
  );

  await writeAuditLog(req, "Generated new 2FA recovery codes", {
    actor: `${staff.fname} ${staff.lname}`,
    role: staff.role,
  });

  return NextResponse.json({ ok: true, data: { codes } });
}

async function handleGetRecoveryCodesStatus(req, user, body) {
  const count = await getRecoveryCodesCount(user.userId);
  return NextResponse.json({ ok: true, data: { count } });
}

async function handleDisableRecoveryCodes(req, user, body) {
  const staff = await getStaffById(user.userId);
  if (!staff) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  await dbRun("DELETE FROM staff_recovery_codes WHERE staff_id = ?", [user.userId]);

  if (!staff.totp_secret) {
    await dbRun(
      "UPDATE staff SET totp_enabled = 0, updated_at = datetime('now') WHERE id = ?",
      [user.userId]
    );
  }

  await writeAuditLog(req, "Disabled 2FA recovery codes", {
    actor: `${staff.fname} ${staff.lname}`,
    role: staff.role,
  });

  return NextResponse.json({ ok: true, data: { enabled: false } });
}

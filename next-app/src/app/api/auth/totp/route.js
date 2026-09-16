import { NextResponse } from "next/server";
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
import { requireAuth, createAuthErrorResponse } from "../../../../lib/authHelpers";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireAuth(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  if (access.user.principalType !== "staff") return createAuthErrorResponse("Access denied", 403);
  const user = { userId: access.user.id, payload: access.user.payload };

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
  const access = await requireAuth(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  if (access.user.principalType !== "staff") return createAuthErrorResponse("Access denied", 403);
  const user = { userId: access.user.id, payload: access.user.payload };

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
  } else if (action === "cancel-setup") {
    return handleCancelSetup(req, user, body);
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
  const encrypted = encryptSecret(secret);
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
  if (!isValidToken(token)) {
    return NextResponse.json({ ok: false, error: "Invalid token format" }, { status: 400 });
  }

  const staff = await getStaffById(user.userId);
  if (!staff || !staff.totp_secret) {
    return NextResponse.json({ ok: false, error: "TOTP not initialized" }, { status: 400 });
  }

  const decrypted = decryptSecret(staff.totp_secret);
  if (!decrypted) {
    return NextResponse.json({ ok: false, error: "Failed to decrypt TOTP secret" }, { status: 500 });
  }

  const isValid = verifyTOTP(token, decrypted);
  if (!isValid) {
    return NextResponse.json({ ok: false, error: "Invalid verification code" }, { status: 401 });
  }

  await dbRun(
    "UPDATE staff SET totp_enabled = TRUE, updated_at = datetime('now') WHERE id = ?",
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
  if (!isValidToken(token)) {
    return NextResponse.json({ ok: false, error: "Invalid token format" }, { status: 400 });
  }

  const staff = await getStaffById(user.userId);
  if (!staff || !staff.totp_enabled) {
    return NextResponse.json({ ok: false, error: "TOTP not enabled" }, { status: 400 });
  }

  const decrypted = decryptSecret(staff.totp_secret);
  if (!decrypted) {
    return NextResponse.json({ ok: false, error: "Failed to decrypt TOTP secret" }, { status: 500 });
  }

  const isValid = verifyTOTP(token, decrypted);
  if (!isValid) {
    return NextResponse.json({ ok: false, error: "Invalid verification code" }, { status: 401 });
  }

  const recoveryCodesCount = await getRecoveryCodesCount(user.userId);
  const nextTotpEnabled = recoveryCodesCount > 0;

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
  if (!isValidToken(token)) {
    return NextResponse.json({ ok: false, error: "Invalid token format" }, { status: 400 });
  }

  const staff = await getStaffById(user.userId);
  if (!staff || !staff.totp_enabled || !staff.totp_secret) {
    return NextResponse.json({ ok: false, error: "TOTP not configured" }, { status: 400 });
  }

  const decrypted = decryptSecret(staff.totp_secret);
  if (!decrypted) {
    return NextResponse.json({ ok: false, error: "Failed to decrypt TOTP secret" }, { status: 500 });
  }

  const isValid = verifyTOTP(token, decrypted);
  return NextResponse.json({ ok: isValid, data: { valid: isValid } });
}

async function handleGenerateRecoveryCodes(req, user, body) {
  const staff = await getStaffById(user.userId);
  if (!staff) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const codes = await generateRecoveryCodes(user.userId);

  await dbRun(
    "UPDATE staff SET totp_enabled = TRUE, updated_at = datetime('now') WHERE id = ?",
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
      "UPDATE staff SET totp_enabled = FALSE, updated_at = datetime('now') WHERE id = ?",
      [user.userId]
    );
  }

  await writeAuditLog(req, "Disabled 2FA recovery codes", {
    actor: `${staff.fname} ${staff.lname}`,
    role: staff.role,
  });

  return NextResponse.json({ ok: true, data: { enabled: false } });
}

async function handleCancelSetup(req, user, body) {
  const staff = await getStaffById(user.userId);
  if (!staff) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  // Only clear if TOTP is not fully enabled yet
  if (!staff.totp_enabled) {
    await dbRun(
      "UPDATE staff SET totp_secret = NULL, serial_key_hash = NULL, updated_at = datetime('now') WHERE id = ?",
      [user.userId]
    );
  }

  return NextResponse.json({ ok: true });
}

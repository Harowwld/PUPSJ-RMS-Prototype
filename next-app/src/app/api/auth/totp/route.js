import { NextResponse } from "next/server";
import {
  decryptSecret,
  encryptSecret,
  generateQRCode,
  generateTOTPSecret,
  isValidToken,
  verifyTOTP,
} from "../../../../lib/totp";
import {
  clearAccountTOTP,
  deleteAccountRecoveryCodes,
  generateAccountRecoveryCodes,
  getAccountRecoveryCodesCount,
  getAccountSecurity,
  setAccountSerialKey,
  updateAccountTOTPEnabled,
  updateAccountTOTPSecret,
} from "../../../../lib/accountSecurityRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { requireAuth, createAuthErrorResponse } from "../../../../lib/authHelpers";

export const runtime = "nodejs";

function accountContext(user) {
  const principalType = user.principalType;
  const id = principalType === "student" ? user.accountId : user.id;
  return { principalType, id };
}

function actorName(user) {
  const name = [user.fname, user.lname].filter(Boolean).join(" ").trim();
  return name || user.studentNo || user.email || String(user.id);
}

function generateSerialKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) key += "-";
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export async function GET(req) {
  const access = await requireAuth(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  const account = accountContext(access.user);
  const security = await getAccountSecurity(account.principalType, account.id);
  if (!security) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    data: {
      enabled: Boolean(security.totp_enabled),
      hasSecret: Boolean(security.totp_secret),
      recoveryCodesCount: await getAccountRecoveryCodesCount(account.principalType, account.id),
    },
  });
}

export async function POST(req) {
  try {
    const access = await requireAuth(req);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "Authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
    const user = access.user;
    const account = accountContext(user);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    switch (body.action) {
      case "setup":
        return handleSetup(user, account);
      case "verify":
        return handleVerify(req, user, account, body);
      case "disable":
        return handleDisable(req, user, account, body);
      case "validate":
        return handleValidate(user, account, body);
      case "generate-recovery-codes":
        return handleGenerateRecoveryCodes(req, user, account);
      case "get-recovery-codes-status":
        return handleGetRecoveryCodesStatus(account);
      case "disable-recovery-codes":
        return handleDisableRecoveryCodes(req, user, account);
      case "cancel-setup":
        return handleCancelSetup(user, account);
      default:
        return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[POST /api/auth/totp Error]:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}

async function handleSetup(user, account) {
  const security = await getAccountSecurity(account.principalType, account.id);
  if (!security) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  if (security.totp_enabled && security.totp_secret) {
    return NextResponse.json({ ok: false, error: "TOTP already enabled" }, { status: 400 });
  }

  const { secret, otpauthUrl } = generateTOTPSecret(user.email || user.username || String(user.id));
  const qrCode = await generateQRCode(otpauthUrl);
  const serialKey = generateSerialKey();
  await updateAccountTOTPSecret(account.principalType, account.id, encryptSecret(secret));
  await setAccountSerialKey(account.principalType, account.id, serialKey);

  return NextResponse.json({ ok: true, data: { secret, qrCode, serialKey } });
}

async function handleVerify(req, user, account, body) {
  if (!isValidToken(body.token)) {
    return NextResponse.json({ ok: false, error: "Invalid token format" }, { status: 400 });
  }
  const security = await getAccountSecurity(account.principalType, account.id);
  if (!security?.totp_secret) {
    return NextResponse.json({ ok: false, error: "TOTP not initialized" }, { status: 400 });
  }
  const decrypted = decryptSecret(security.totp_secret);
  if (!decrypted) {
    return NextResponse.json({ ok: false, error: "Failed to decrypt TOTP secret. The server encryption key may have changed. Please re-run setup." }, { status: 400 });
  }
  if (!verifyTOTP(body.token, decrypted)) {
    return NextResponse.json({ ok: false, error: "Invalid verification code" }, { status: 401 });
  }
  await updateAccountTOTPEnabled(account.principalType, account.id, true);
  await writeAuditLog(req, "Enabled TOTP authentication", { actor: actorName(user), actor_id: String(account.id), role: user.role });
  return NextResponse.json({ ok: true, data: { enabled: true } });
}

async function handleDisable(req, user, account, body) {
  if (!isValidToken(body.token)) {
    return NextResponse.json({ ok: false, error: "Invalid token format" }, { status: 400 });
  }
  const security = await getAccountSecurity(account.principalType, account.id);
  if (!security?.totp_enabled) {
    return NextResponse.json({ ok: false, error: "TOTP not enabled" }, { status: 400 });
  }
  const decrypted = decryptSecret(security.totp_secret);
  if (decrypted && !verifyTOTP(body.token, decrypted)) {
    return NextResponse.json({ ok: false, error: "Invalid verification code" }, { status: 401 });
  }

  const nextTotpEnabled = await getAccountRecoveryCodesCount(account.principalType, account.id) > 0;
  await updateAccountTOTPSecret(account.principalType, account.id, null);
  await updateAccountTOTPEnabled(account.principalType, account.id, nextTotpEnabled);
  await writeAuditLog(req, decrypted ? "Disabled TOTP authentication" : "Reset corrupted TOTP authentication", {
    actor: actorName(user), actor_id: String(account.id), role: user.role,
  });
  return NextResponse.json({ ok: true, data: { enabled: false } });
}

async function handleValidate(user, account, body) {
  if (!isValidToken(body.token)) {
    return NextResponse.json({ ok: false, error: "Invalid token format" }, { status: 400 });
  }
  const security = await getAccountSecurity(account.principalType, account.id);
  if (!security?.totp_enabled || !security.totp_secret) {
    return NextResponse.json({ ok: false, error: "TOTP not configured" }, { status: 400 });
  }
  const decrypted = decryptSecret(security.totp_secret);
  if (!decrypted) {
    return NextResponse.json({ ok: false, error: "Failed to decrypt TOTP secret. Please reconfigure your two-factor authentication." }, { status: 400 });
  }
  const valid = verifyTOTP(body.token, decrypted);
  return NextResponse.json({ ok: valid, data: { valid } });
}

async function handleGenerateRecoveryCodes(req, user, account) {
  const security = await getAccountSecurity(account.principalType, account.id);
  if (!security) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  const codes = await generateAccountRecoveryCodes(account.principalType, account.id);
  await updateAccountTOTPEnabled(account.principalType, account.id, true);
  await writeAuditLog(req, "Generated new 2FA recovery codes", { actor: actorName(user), actor_id: String(account.id), role: user.role });
  return NextResponse.json({ ok: true, data: { codes } });
}

async function handleGetRecoveryCodesStatus(account) {
  const count = await getAccountRecoveryCodesCount(account.principalType, account.id);
  return NextResponse.json({ ok: true, data: { count } });
}

async function handleDisableRecoveryCodes(req, user, account) {
  const security = await getAccountSecurity(account.principalType, account.id);
  if (!security) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  await deleteAccountRecoveryCodes(account.principalType, account.id);
  if (!security.totp_secret) await updateAccountTOTPEnabled(account.principalType, account.id, false);
  await writeAuditLog(req, "Disabled 2FA recovery codes", { actor: actorName(user), actor_id: String(account.id), role: user.role });
  return NextResponse.json({ ok: true, data: { enabled: false } });
}

async function handleCancelSetup(user, account) {
  const security = await getAccountSecurity(account.principalType, account.id);
  if (!security) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  if (!security.totp_enabled) await clearAccountTOTP(account.principalType, account.id);
  return NextResponse.json({ ok: true });
}

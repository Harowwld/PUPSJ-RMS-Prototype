import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "node:crypto";

const ENCRYPTION_KEY = process.env.TOTP_SECRET_KEY || process.env.JWT_SECRET || "default-dev-key-change-in-prod";

function getEncryptionKey() {
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}

export function encryptSecret(secret) {
  if (!secret) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", getEncryptionKey(), iv);
  let encrypted = cipher.update(secret, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptSecret(encrypted) {
  if (!encrypted) return null;
  try {
    const parts = encrypted.split(":");
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", getEncryptionKey(), iv);
    let decrypted = decipher.update(parts[1], "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

export function generateTOTPSecret(email, issuer = "PUPSJ Records Keeping System") {
  const secret = speakeasy.generateSecret({
    name: `${issuer} (${email})`,
    length: 32,
  });
  
  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
  };
}

export async function generateQRCode(otpauthUrl) {
  return await QRCode.toDataURL(otpauthUrl);
}

export function verifyTOTP(token, secret) {
  if (!token || !secret) return false;
  
  const tokenStr = token.trim();
  if (tokenStr.length !== 6) return false;
  
  // Debug: show secret and expected values
  console.log("[TOTP DEBUG] Secret (base32):", secret);
  console.log("[TOTP DEBUG] Input token:", tokenStr);
  
  const now = Math.floor(Date.now() / 1000);
  const epoch = 30;
  const currentWindow = Math.floor(now / epoch);
  
  // Generate expected tokens for each window using time offset
  const expectedCurrent = speakeasy.totp({ secret, encoding: "base32", time: now });
  const expectedPrev = speakeasy.totp({ secret, encoding: "base32", time: now - epoch });
  const expectedNext = speakeasy.totp({ secret, encoding: "base32", time: now + epoch });
  console.log("[TOTP DEBUG] Expected tokens:", { prev: expectedPrev, current: expectedCurrent, next: expectedNext });
  console.log("[TOTP DEBUG] Current window:", currentWindow, "epoch:", epoch, "time:", new Date().toISOString());
  
  // Use speakeasy to verify - it handles time drift automatically
  // speakeasy returns the expected token (string) on failure, true on success
  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: "base32",
    token: tokenStr,
    window: 1,
  });
  
  const isValid = verified === true;
  console.log("[TOTP DEBUG] Verification result:", verified, "-> isValid:", isValid);
  return isValid;
}

export function isValidToken(token) {
  if (!token || typeof token !== "string") return false;
  return /^\d{6}$/.test(token.trim());
}

import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "node:crypto";

function getEncryptionKey() {
  const encryptionKey = process.env.TOTP_SECRET_KEY || process.env.JWT_SECRET;
  if (!encryptionKey) throw new Error("Missing TOTP_SECRET_KEY or JWT_SECRET environment variable");
  return crypto.createHash("sha256").update(encryptionKey).digest();
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
  if (!encrypted || typeof encrypted !== "string") return null;
  try {
    const parts = encrypted.split(":");
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], "hex");
    if (iv.length !== 16) return null;
    const decipher = crypto.createDecipheriv("aes-256-cbc", getEncryptionKey(), iv);
    let decrypted = decipher.update(parts[1], "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[TOTP] Failed to decrypt TOTP secret:", err?.message || err);
    }
    return null;
  }
}

export function generateTOTPSecret(email, issuer = "PUPSJ-RMS") {
  // RFC 6238 recommends 20 bytes (160 bits) for HMAC-SHA1
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `${issuer}:${email}`,
  });
  
  // Standard RFC 6238 / Google Authenticator Key URI with percent-encoded label and explicit issuer
  const encodedLabel = `${encodeURIComponent(issuer)}:${encodeURIComponent(email)}`;
  const otpauthUrl = speakeasy.otpauthURL({
    secret: secret.base32,
    label: encodedLabel,
    issuer: issuer,
    encoding: "base32",
  });
  
  return {
    secret: secret.base32,
    otpauthUrl,
  };
}

export async function generateQRCode(otpauthUrl) {
  return await QRCode.toDataURL(otpauthUrl);
}

export function verifyTOTP(token, secret, options = {}) {
  if (!token || !secret) return false;
  
  const tokenStr = String(token).trim();
  if (tokenStr.length !== 6) return false;
  
  // Allow window override via env or options (default to 2: ±60 seconds to absorb container/host/mobile drift)
  const windowEnv = process.env.TOTP_WINDOW ? parseInt(process.env.TOTP_WINDOW, 10) : 2;
  const windowVal = Number.isInteger(options.window) ? options.window : (Number.isInteger(windowEnv) ? windowEnv : 2);
  
  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: "base32",
    token: tokenStr,
    window: Math.max(1, Math.min(windowVal, 5)),
  });
  
  return verified === true;
}

export function isValidToken(token) {
  if (!token || typeof token !== "string") return false;
  return /^\d{6}$/.test(token.trim());
}

import { getStaffById } from "./staffRepo";
import { verifyTOTP, decryptSecret, isValidToken } from "./totp";

export async function requireTOTP(userId, token) {
  if (!userId) {
    return { valid: false, error: "User ID required" };
  }

  const staff = await getStaffById(userId);
  if (!staff) {
    return { valid: false, error: "User not found" };
  }

  // If TOTP is NOT enabled, we don't need a token.
  if (!staff.totp_enabled || !staff.totp_secret) {
    return { valid: true, error: null };
  }

  // TOTP is enabled, so we REQUIRE a valid token.
  if (!token) {
    return { valid: false, error: "Verification code required", missing: true };
  }

  if (!isValidToken(token)) {
    return { valid: false, error: "Invalid verification code format (must be 6 digits)" };
  }

  const decrypted = decryptSecret(staff.totp_secret);
  if (!decrypted) {
    return { valid: false, error: "Failed to decrypt TOTP secret" };
  }

  const isValid = verifyTOTP(token, decrypted);
  if (!isValid) {
    return { valid: false, error: "Invalid verification code" };
  }

  return { valid: true, error: null };
}

export function extractTOTPToken(headers) {
  if (!headers) return null;
  
  // Try case-insensitive lookup first if it's a Headers object
  if (typeof headers.get === 'function') {
    const token = headers.get("x-totp-token");
    if (token) return token.trim();
    
    // Fallback to common variations
    const variations = ["X-TOTP-Token", "X-Totp-Token", "x-totp-code"];
    for (const v of variations) {
      const val = headers.get(v);
      if (val) return val.trim();
    }
  } else {
    // If it's a plain object, try common variations
    const keys = Object.keys(headers);
    for (const k of keys) {
      if (k.toLowerCase() === "x-totp-token" || k.toLowerCase() === "x-totp-code") {
        return String(headers[k] || "").trim();
      }
    }
  }
  
  return null;
}

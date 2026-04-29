import { getStaffById } from "./staffRepo";
import { verifyTOTP, decryptSecret, isValidToken } from "./totp";

export async function requireTOTP(userId, token) {
  if (!userId) {
    return { valid: false, error: "User ID required" };
  }

  if (!token || !isValidToken(token)) {
    return { valid: false, error: "Invalid token format" };
  }

  const staff = await getStaffById(userId);
  if (!staff) {
    return { valid: false, error: "User not found" };
  }

  if (!staff.totp_enabled || !staff.totp_secret) {
    return { valid: true, error: null };
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
  const authHeader = headers.get("x-totp-token");
  if (authHeader && isValidToken(authHeader)) {
    return authHeader.trim();
  }
  return null;
}

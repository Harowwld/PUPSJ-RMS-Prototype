/**
 * Removes sensitive fields from a staff or student record before sending it to the client.
 */
export function sanitizeUser(user) {
  if (!user) return null;
  
  // If it's an array, sanitize each item
  if (Array.isArray(user)) {
    return user.map(u => sanitizeUser(u));
  }

  // Remove sensitive fields, keep the rest
  const safeData = { ...user };
  delete safeData.password_hash;
  delete safeData.totp_secret;
  delete safeData.recovery_codes;

  return safeData;
}

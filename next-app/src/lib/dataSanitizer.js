/**
 * Removes sensitive fields from a staff or student record before sending it to the client.
 */
export function sanitizeUser(user) {
  if (!user) return null;
  
  // If it's an array, sanitize each item
  if (Array.isArray(user)) {
    return user.map(u => sanitizeUser(u));
  }

  // Destructure sensitive fields out, keep the rest
  const {
    password_hash,
    totp_secret,
    recovery_codes,
    ...safeData
  } = user;

  return safeData;
}

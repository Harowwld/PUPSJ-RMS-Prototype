const KNOWN_DEMO_PASSWORDS = new Set(["pupstaff", "student123", "password", "password123"]);

export function validatePasswordPolicy(password, { production = process.env.NODE_ENV === "production", allowDefault = false } = {}) {
  const value = String(password || "");
  if (value.length < 8) return { valid: false, reason: "Password must be at least 8 characters long." };
  if (value.length > 128) return { valid: false, reason: "Password must not exceed 128 characters." };

  const configuredDefault = String(process.env.DEFAULT_STAFF_PASSWORD || "pupstaff");
  if (!allowDefault && value === configuredDefault) {
    return { valid: false, reason: "Password cannot be the configured default password." };
  }
  if (production && KNOWN_DEMO_PASSWORDS.has(value.toLowerCase())) {
    return { valid: false, reason: "Known demo passwords are not allowed in production." };
  }

  return { valid: true, reason: null };
}

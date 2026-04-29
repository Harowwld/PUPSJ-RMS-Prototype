/**
 * Role-based access control utilities
 * Shared between client components and API routes
 */

/**
 * Check if a role string represents an Admin role
 * Recognizes: "admin", "administrator", "superadmin" (case-insensitive)
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export function isAdminRole(role) {
  const normalized = String(role || "").toLowerCase().trim();
  return ["admin", "administrator", "superadmin"].includes(normalized);
}

/**
 * Check if a role string represents a Staff role (non-admin)
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export function isStaffRole(role) {
  const normalized = String(role || "").toLowerCase().trim();
  return normalized === "staff" || normalized === "records staff";
}

/**
 * Check if user has either admin or staff privileges
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export function hasStaffPrivileges(role) {
  return isAdminRole(role) || isStaffRole(role);
}

/**
 * Get a normalized role label for display
 * @param {string} role - The raw role string
 * @returns {string}
 */
export function getRoleLabel(role) {
  const normalized = String(role || "").toLowerCase().trim();
  if (isAdminRole(normalized)) return "Administrator";
  if (isStaffRole(normalized)) return "Records Staff";
  return role || "User";
}

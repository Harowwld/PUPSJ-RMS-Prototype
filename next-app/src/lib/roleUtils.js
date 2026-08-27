/**
 * Role-based access control utilities
 * Shared between client components and API routes
 * 
 * Role hierarchy:
 *   SystemAdmin (global, no office_id)
 *     └── Admin (office-scoped)
 *         └── Staff (office-scoped)
 */

/**
 * Check if a role string represents a SystemAdmin role (global, above all offices)
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export function isSystemAdminRole(role) {
  const normalized = String(role || "").toLowerCase().trim();
  return normalized === "systemadmin" || normalized === "system_admin" || normalized === "system admin" || normalized === "superadmin" || normalized === "super admin";
}

/**
 * Check if a role string represents an Admin role (office-scoped)
 * Recognizes: "admin", "administrator" (case-insensitive)
 * Note: SystemAdmin is NOT an Admin — they're distinct levels.
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export function isAdminRole(role) {
  const normalized = String(role || "").toLowerCase().trim();
  // SystemAdmin is a separate, higher role
  if (isSystemAdminRole(normalized)) return false;
  return ["admin", "administrator"].includes(normalized);
}

/**
 * Check if a role has admin-level privileges (Admin OR SystemAdmin).
 * Use this when you want to allow both Admin and SystemAdmin.
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export function hasAdminPrivileges(role) {
  return isAdminRole(role) || isSystemAdminRole(role);
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
 * Check if user has either admin or staff privileges (any authenticated user)
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export function hasStaffPrivileges(role) {
  return isSystemAdminRole(role) || isAdminRole(role) || isStaffRole(role);
}

/**
 * Check if a role has global access (not scoped to an office).
 * Currently only SystemAdmin has global access.
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export function hasGlobalAccess(role) {
  return isSystemAdminRole(role);
}

/**
 * Get a normalized role label for display
 * @param {string} role - The raw role string
 * @returns {string}
 */
export function getRoleLabel(role) {
  const normalized = String(role || "").toLowerCase().trim();
  if (isSystemAdminRole(normalized)) return "System Administrator";
  if (isAdminRole(normalized)) return "Administrator";
  if (isStaffRole(normalized)) return "Records Staff";
  return role || "User";
}

/**
 * Get all valid role values for forms/dropdowns.
 * @param {boolean} includeSystemAdmin - Whether to include SystemAdmin in the list
 * @returns {Array<{value: string, label: string}>}
 */
export function getAvailableRoles(includeSystemAdmin = false) {
  const roles = [
    { value: "Admin", label: "Administrator" },
    { value: "Staff", label: "Records Staff" },
  ];

  if (includeSystemAdmin) {
    roles.unshift({ value: "SystemAdmin", label: "System Administrator" });
  }

  return roles;
}

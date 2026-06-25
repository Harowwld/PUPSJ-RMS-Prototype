/**
 * Role-based access control utilities
 * Shared between client components and API routes
 * 
 * Role hierarchy:
 *   SuperAdmin (global, no office_id)
 *     └── Admin (office-scoped)
 *         └── Staff (office-scoped)
 */

/**
 * Check if a role string represents a SuperAdmin role (global, above all offices)
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export function isSuperAdminRole(role) {
  const normalized = String(role || "").toLowerCase().trim();
  return normalized === "superadmin" || normalized === "super_admin" || normalized === "super admin";
}

/**
 * Check if a role string represents an Admin role (office-scoped)
 * Recognizes: "admin", "administrator" (case-insensitive)
 * Note: SuperAdmin is NOT an Admin — they're distinct levels.
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export function isAdminRole(role) {
  const normalized = String(role || "").toLowerCase().trim();
  // SuperAdmin is a separate, higher role
  if (isSuperAdminRole(normalized)) return false;
  return ["admin", "administrator"].includes(normalized);
}

/**
 * Check if a role has admin-level privileges (Admin OR SuperAdmin).
 * Use this when you want to allow both Admin and SuperAdmin.
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export function hasAdminPrivileges(role) {
  return isAdminRole(role) || isSuperAdminRole(role);
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
  return isSuperAdminRole(role) || isAdminRole(role) || isStaffRole(role);
}

/**
 * Check if a role has global access (not scoped to an office).
 * Currently only SuperAdmin has global access.
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export function hasGlobalAccess(role) {
  return isSuperAdminRole(role);
}

/**
 * Get a normalized role label for display
 * @param {string} role - The raw role string
 * @returns {string}
 */
export function getRoleLabel(role) {
  const normalized = String(role || "").toLowerCase().trim();
  if (isSuperAdminRole(normalized)) return "Super Administrator";
  if (isAdminRole(normalized)) return "Administrator";
  if (isStaffRole(normalized)) return "Records Staff";
  return role || "User";
}

/**
 * Get all valid role values for forms/dropdowns.
 * @param {boolean} includeSuperAdmin - Whether to include SuperAdmin in the list
 * @returns {Array<{value: string, label: string}>}
 */
export function getAvailableRoles(includeSuperAdmin = false) {
  const roles = [
    { value: "Admin", label: "Administrator" },
    { value: "Staff", label: "Records Staff" },
  ];

  if (includeSuperAdmin) {
    roles.unshift({ value: "SuperAdmin", label: "Super Administrator" });
  }

  return roles;
}

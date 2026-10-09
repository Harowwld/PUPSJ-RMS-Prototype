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
 * Convert all supported role spellings to the documented canonical labels.
 * SystemAdmin and SuperAdmin remain distinct labels for compatibility, but
 * both are global administrator roles and are treated as equivalent by policy.
 */
export function normalizeRole(role) {
  const normalized = String(role || "").toLowerCase().trim().replace(/[_-]+/g, " ");
  if (normalized === "student") return "Student";
  if (normalized === "systemadmin" || normalized === "system admin") return "SystemAdmin";
  if (normalized === "superadmin" || normalized === "super admin") return "SuperAdmin";
  if (normalized === "admin" || normalized === "administrator" || normalized.endsWith(" admin") || normalized.endsWith(" administrator")) return "Admin";
  if (normalized === "staff" || normalized === "records staff" || normalized.endsWith(" staff")) return "Staff";
  return null;
}

export function isStudentRole(role) {
  return normalizeRole(role) === "Student";
}

export function canManageGlobal(role) {
  return isSystemAdminRole(role);
}

export function canManageStaffRole(actorRole, targetRole) {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  if (!actor || !target || target === "Student") return false;
  if (isSystemAdminRole(actor)) return true;
  return actor === "Admin" && (target === "Admin" || target === "Staff");
}

/**
 * Prevent an administrator from removing their own access or the last active
 * global administrator's access.
 */
export function canDeactivateStaffAccount({ actorId, targetId, targetRole, activeGlobalAdminCount }) {
  if (!actorId || !targetId || String(actorId) === String(targetId)) return false;
  if (isSystemAdminRole(targetRole) && Number(activeGlobalAdminCount) <= 1) return false;
  return true;
}

export function canAccessOffice(principal, officeId) {
  if (!principal || !officeId) return false;
  if (isSystemAdminRole(principal.role)) return true;
  const principalOffice = principal.officeId ?? principal.office_id;
  return Boolean(principalOffice) && String(principalOffice).toLowerCase() === String(officeId).toLowerCase();
}

/**
 * Check if a role string represents a SystemAdmin role (global, above all offices)
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export function isSystemAdminRole(role) {
  const normalized = String(role || "").toLowerCase().trim().replace(/[_-]+/g, " ");
  return normalized === "systemadmin" || normalized === "system admin" || normalized === "superadmin" || normalized === "super admin";
}

/**
 * Check if a role string represents an Admin role (office-scoped)
 * Recognizes: "admin", "administrator" (case-insensitive)
 * Note: SystemAdmin is NOT an Admin — they're distinct levels.
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export function isAdminRole(role) {
  const normalized = String(role || "").toLowerCase().trim().replace(/[_-]+/g, " ");
  // SystemAdmin is a separate, higher role
  if (isSystemAdminRole(normalized)) return false;
  return ["admin", "administrator"].includes(normalized) || normalized.endsWith(" admin") || normalized.endsWith(" administrator");
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
  const normalized = String(role || "").toLowerCase().trim().replace(/[_-]+/g, " ");
  if (isSystemAdminRole(normalized) || isAdminRole(normalized)) return false;
  return normalized === "staff" || normalized === "records staff" || normalized.endsWith(" staff");
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

// Runtime registry of dynamic offices created/loaded in the application
const dynamicOfficeRegistry = new Map();

/**
 * Register dynamic office metadata into the runtime registry.
 * @param {Array<object> | object} offices - Office object(s) with id, short_name, name
 */
export function registerOffices(offices) {
  if (!offices) return;
  const list = Array.isArray(offices) ? offices : [offices];
  for (const o of list) {
    if (!o) continue;
    const id = String(o.id || o.office_id || "").toLowerCase().trim();
    const shortName = o.short_name || o.office_short_name;
    if (id && shortName) {
      dynamicOfficeRegistry.set(id, shortName);
    }
  }
}

/**
 * Format an office identifier string into a clean title or uppercase acronym fallback.
 * @param {string} slug
 * @returns {string}
 */
export function formatOfficeFallback(slug) {
  const clean = String(slug || "").trim();
  if (!clean) return "Registrar";

  const lower = clean.toLowerCase();
  if (dynamicOfficeRegistry.has(lower)) {
    return dynamicOfficeRegistry.get(lower);
  }

  // If contains hyphens or underscores: title-case each segment
  if (clean.includes("-") || clean.includes("_")) {
    return clean
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => formatOfficeFallback(part))
      .join(" ");
  }

  // If 4 chars or fewer (e.g. "osas", "ssc", "gco"), treat as acronym
  if (clean.length <= 4 && !/[0-9]/.test(clean)) {
    return clean.toUpperCase();
  }

  // Otherwise, Title Case the string (e.g. "guidance" -> "Guidance", "research" -> "Research")
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Map an office ID, office object, or staff record to its canonical short prefix dynamically.
 * Priority:
 * 1. Explicit short_name or office_short_name on passed object
 * 2. Lookup in passed optional offices list / array
 * 3. Lookup in dynamic runtime registry
 * 4. Fallback formatting
 *
 * @param {string | object} office - Office ID string, office object, or staff object
 * @param {Array<object>} [offices] - Optional array of office records
 * @returns {string} Canonical short prefix
 */
export function getOfficePrefix(office, offices = null) {
  if (!office) return "Registrar";

  // If passed an object (e.g. staff member or office record)
  if (typeof office === "object") {
    if (office.office_short_name) return office.office_short_name;
    if (office.short_name) return office.short_name;
    if (office.office_name) return office.office_name;
    office = office.office_id || office.id;
  }

  const officeStr = String(office || "").trim();
  if (!officeStr) return "Registrar";
  const officeNorm = officeStr.toLowerCase();

  // If an offices collection was provided, look it up dynamically
  if (Array.isArray(offices) && offices.length > 0) {
    const found = offices.find(
      (o) =>
        String(o?.id || "").toLowerCase() === officeNorm ||
        String(o?.short_name || "").toLowerCase() === officeNorm
    );
    if (found?.short_name) {
      dynamicOfficeRegistry.set(officeNorm, found.short_name);
      return found.short_name;
    }
  }

  // Check dynamic runtime registry
  if (dynamicOfficeRegistry.has(officeNorm)) {
    return dynamicOfficeRegistry.get(officeNorm);
  }

  // Fallback heuristic (no hardcoded closed map)
  return formatOfficeFallback(officeStr);
}

/**
 * Get an office-scoped role label dynamically
 * @param {string} role - The raw role string ("Admin", "Staff", etc.)
 * @param {string | object} office - The office identifier or record
 * @param {Array<object>} [offices] - Optional array of office records
 * @returns {string} Formatted label (e.g. "Guidance Staff", "OSAS Admin", "Registrar Staff")
 */
export function getOfficeRoleLabel(role, office, offices = null) {
  if (isSystemAdminRole(role)) return "System Admin";
  const normalized = normalizeRole(role);
  const officePrefix = getOfficePrefix(office, offices);

  if (normalized === "Admin") {
    return officePrefix ? `${officePrefix} Admin` : "Administrator";
  }
  if (normalized === "Staff") {
    return officePrefix ? `${officePrefix} Staff` : "Staff";
  }
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

/**
 * Get the default dashboard route for a given user role.
 * @param {string} role - The role string
 * @returns {string} The canonical dashboard path ("/systemadmin", "/admin", "/student", or "/staff")
 */
export function getDefaultDashboardPath(role) {
  if (isSystemAdminRole(role)) return "/systemadmin";
  if (isAdminRole(role)) return "/admin";
  if (String(role || "").toLowerCase() === "student") return "/student";
  return "/staff";
}

/**
 * Return whether a principal may enter a page route.
 *
 * This is intentionally pure so middleware and client-side code can share the
 * route policy without importing database or Node-only authorization code.
 * Resource ownership and office scope remain server-side concerns.
 */
export function canAccessPage(pathname, role, { authenticated = true } = {}) {
  const path = String(pathname || "");
  const normalizedRole = normalizeRole(role);

  if (path === "/student" || path.startsWith("/student/")) {
    return !authenticated || normalizedRole === "Student";
  }

  if (path === "/systemadmin" || path.startsWith("/systemadmin/") ||
      path === "/superadmin" || path.startsWith("/superadmin/")) {
    return normalizedRole === "SystemAdmin" || normalizedRole === "SuperAdmin";
  }

  if (path === "/admin" || path.startsWith("/admin/")) {
    return normalizedRole === "Admin";
  }

  if (path === "/staff" || path.startsWith("/staff/")) {
    return normalizedRole === "Staff" || normalizedRole === "Admin";
  }

  if (path === "/account" || path.startsWith("/account/")) {
    return Boolean(authenticated && normalizedRole);
  }

  return true;
}

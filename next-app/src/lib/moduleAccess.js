import { queryOne } from "./postgres.js";
import { getAuthenticatedPrincipal } from "./authHelpers.js";
import { isSystemAdminRole, normalizeRole } from "./roleUtils.js";

async function getVerifiedStaffSession(req) {
  try {
    const principal = await getAuthenticatedPrincipal(req);
    if (!principal) return null;
    if (principal.principalType !== "staff") return false;
    return {
      id: principal.id,
      userId: principal.id,
      role: principal.role,
      officeId: principal.officeId || null,
      status: principal.status,
      principalType: principal.principalType,
    };
  } catch {
    return null;
  }
}

export async function requireSuperAdminSession(req) {
  const session = await getVerifiedStaffSession(req);
  if (session === null) return null;
  return isSystemAdminRole(session.role) ? session : false;
}

export async function requireOfficeModule(moduleId, { officeId, roles = ["Admin", "Staff"] } = {}, req) {
  const session = await getVerifiedStaffSession(req);
  if (session === null) return null;
  if (!session) return false;
  if (isSystemAdminRole(session.role)) return { ...session, officeId: officeId || session.officeId };
  const normalizedRoles = roles.map(normalizeRole).filter(Boolean);
  if (!normalizedRoles.includes(normalizeRole(session.role)) || !session.officeId || (officeId && String(officeId).toLowerCase() !== String(session.officeId).toLowerCase())) return false;
  const assignment = await queryOne(
    "SELECT enabled FROM office_modules WHERE office_id = $1 AND module_id = $2",
    [session.officeId, moduleId]
  );
  return assignment?.enabled ? session : false;
}

import { queryOne } from "./postgres.js";
import { isSystemAdminRole } from "./roleUtils.js";

export async function isStaffOfficeActive(officeId, role) {
  if (!officeId || isSystemAdminRole(role)) return true;
  const office = await queryOne("SELECT status FROM offices WHERE id = $1", [officeId]);
  return office?.status === "Active";
}

import { cookies } from "next/headers";
import { queryOne } from "./postgres";
import { getSessionCookieName, verifySessionToken } from "./jwt";

async function getVerifiedStaffSession() {
  try {
    const token = (await cookies()).get(getSessionCookieName())?.value;
    if (!token) return null;
    const payload = await verifySessionToken(token);
    const staff = await queryOne(
      "SELECT id, role, office_id, status FROM staff WHERE id = $1",
      [payload?.sub]
    );
    if (!staff || staff.status !== "Active" || staff.role !== payload?.role) return null;
    return { role: staff.role, officeId: staff.office_id || null, userId: staff.id };
  } catch {
    return null;
  }
}

export async function requireSuperAdminSession() {
  const session = await getVerifiedStaffSession();
  return session?.role === "SuperAdmin" ? session : null;
}

export async function requireOfficeModule(moduleId, { officeId, roles = ["Admin", "Staff"] } = {}) {
  const session = await getVerifiedStaffSession();
  if (!session) return null;
  if (session.role === "SuperAdmin") return { ...session, officeId: officeId || session.officeId };
  if (!roles.includes(session.role) || !session.officeId || (officeId && officeId !== session.officeId)) return null;
  const assignment = await queryOne(
    "SELECT enabled FROM office_modules WHERE office_id = $1 AND module_id = $2",
    [session.officeId, moduleId]
  );
  return assignment?.enabled ? session : null;
}

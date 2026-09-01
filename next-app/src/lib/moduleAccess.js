import { headers } from "next/headers";
import { cookies } from "next/headers";
import { queryOne } from "./postgres";
import { getSessionCookieName, verifySessionToken } from "./jwt";

export async function requireOfficeModule(moduleId, { officeId, roles = ["Admin", "Staff"] } = {}) {
  const requestHeaders = await headers();
  let role = String(requestHeaders.get("x-user-role") || "");
  let sessionOfficeId = String(requestHeaders.get("x-office-id") || "");
  const token = (await cookies()).get(getSessionCookieName())?.value;
  if (token) {
    try {
      const payload = await verifySessionToken(token);
      role = String(payload?.role || role);
      sessionOfficeId = String(payload?.office_id || sessionOfficeId);
    } catch {
      return null;
    }
  }
  if (role === "SuperAdmin") return { role, officeId: officeId || sessionOfficeId };
  if (!roles.includes(role) || !sessionOfficeId || (officeId && officeId !== sessionOfficeId)) return null;
  const assignment = await queryOne(
    "SELECT enabled FROM office_modules WHERE office_id = $1 AND module_id = $2",
    [sessionOfficeId, moduleId]
  );
  return assignment?.enabled ? { role, officeId: sessionOfficeId } : null;
}

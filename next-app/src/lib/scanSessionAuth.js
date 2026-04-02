import { cookies } from "next/headers";
import { getSessionCookieName, verifySessionToken } from "./jwt.js";
import { getStaffById } from "./staffRepo.js";

export async function getSessionStaff() {
  const cookieName = getSessionCookieName();
  const store = await cookies();
  const token = store.get(cookieName)?.value || "";
  if (!token) return null;
  try {
    const payload = await verifySessionToken(token);
    const userId = String(payload?.sub || "").trim();
    if (!userId) return null;
    return await getStaffById(userId);
  } catch {
    return null;
  }
}

export function isActiveStaff(staff) {
  return staff && String(staff.status || "").toLowerCase() === "active";
}

import { cookies } from "next/headers";
import { createAuditLog } from "./auditLogsRepo";
import { getSessionCookieName, verifySessionToken } from "./jwt";
import { getStaffById, getStaffDisplayName } from "./staffRepo";

function extractIp(req) {
  const forwarded = req?.headers?.get?.("x-forwarded-for") || "";
  const realIp = req?.headers?.get?.("x-real-ip") || "";
  return forwarded.split(",")[0].trim() || realIp || null;
}

async function resolveActor() {
  try {
    const store = await cookies();
    const token = store.get(getSessionCookieName())?.value || "";
    if (!token) return { actor: "System", role: "System" };

    const payload = await verifySessionToken(token);
    const id = String(payload?.sub || "").trim();
    if (!id) return { actor: "System", role: "System" };

    const staff = await getStaffById(id);
    return {
      actor: getStaffDisplayName(staff) || id,
      role: staff?.role || String(payload?.role || "Staff"),
    };
  } catch {
    return { actor: "System", role: "System" };
  }
}

export async function writeAuditLog(req, action, overrides = {}) {
  try {
    const base = await resolveActor();
    await createAuditLog({
      actor: overrides.actor || base.actor,
      role: overrides.role || base.role,
      action: String(action || "").trim(),
      ip: overrides.ip || extractIp(req),
    });
  } catch (err) {
    console.error("Audit log write failed:", err?.message || err);
  }
}

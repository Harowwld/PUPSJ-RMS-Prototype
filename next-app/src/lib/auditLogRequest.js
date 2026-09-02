import { createAuditLog, createGlobalAuditLog } from "./auditLogsRepo";
import { getSessionCookieName, verifySessionToken } from "./jwt";
import { getStaffById, getStaffDisplayName } from "./staffRepo";

function extractIp(req) {
  const forwarded = req?.headers?.get?.("x-forwarded-for") || "";
  const realIp = req?.headers?.get?.("x-real-ip") || "";
  return forwarded.split(",")[0].trim() || realIp || null;
}

async function resolveActor(req) {
  try {
    const token = req?.cookies?.get?.(getSessionCookieName())?.value || "";
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
    const base = await resolveActor(req);
    const userAgent = req?.headers?.get?.("user-agent") || "";
    const officeId = req?.headers?.get?.("x-office-id") || overrides.officeId || overrides.office_id || null;

    // 1. Write to local office database
    await createAuditLog({
      actor: overrides.actor || base.actor,
      role: overrides.role || base.role,
      action: String(action || "").trim(),
      details: overrides.details || "",
      severity: overrides.severity || "INFO",
      user_agent: userAgent,
      entity_type: overrides.entity_type || "",
      entity_id: overrides.entity_id || "",
      ip: overrides.ip || extractIp(req),
    });

    // 2. Write to system-wide global database
    await createGlobalAuditLog({
      actor: overrides.actor || base.actor,
      role: overrides.role || base.role,
      officeId: officeId,
      action: String(action || "").trim(),
      details: overrides.details || "",
      severity: overrides.severity || "INFO",
      ip: overrides.ip || extractIp(req),
    });
  } catch (err) {
    console.error("Audit log write failed:", err?.message || err);
  }
}

export async function writeGlobalAuditLog(req, action, overrides = {}) {
  try {
    const base = await resolveActor(req);
    const userAgent = req?.headers?.get?.("user-agent") || "";

    await createGlobalAuditLog({
      actor: overrides.actor || base.actor,
      role: overrides.role || base.role,
      officeId: overrides.officeId || overrides.office_id || null,
      action: String(action || "").trim(),
      details: overrides.details || "",
      severity: overrides.severity || "INFO",
      user_agent: userAgent,
      entity_type: overrides.entity_type || "",
      entity_id: overrides.entity_id || "",
      ip: overrides.ip || extractIp(req),
    });
  } catch (err) {
    console.error("Global audit log write failed:", err?.message || err);
  }
}

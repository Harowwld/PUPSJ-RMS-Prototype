import { createGlobalAuditLog } from "./auditLogsRepo.js";
import { getSessionCookieName, verifySessionToken } from "./jwt.js";
import { getStaffById, getStaffDisplayName } from "./staffRepo.js";

function extractIp(req) {
  const forwarded = req?.headers?.get?.("x-forwarded-for") || "";
  const realIp = req?.headers?.get?.("x-real-ip") || "";
  return forwarded.split(",")[0].trim() || realIp || null;
}

async function resolveActor(req) {
  try {
    const cookieName = getSessionCookieName();
    let token = req?.cookies?.get?.(cookieName)?.value || "";
    
    if (!token && req?.headers?.get) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
      if (match) token = decodeURIComponent(match[1]);
    }

    if (!token) return { actor: "System", role: "System", officeId: null };

    const payload = await verifySessionToken(token);
    const id = String(payload?.sub || "").trim();
    if (!id) return { actor: "System", role: "System", officeId: null };

    const role = payload?.role || "";
    if (String(role).toLowerCase() === "student" || payload?.principal_type === "student" || payload?.student_no) {
      return {
        actor: payload?.student_no || payload?.username || id,
        role: "Student",
        officeId: null,
      };
    }

    const staff = await getStaffById(id);
    return {
      actor: getStaffDisplayName(staff) || id,
      role: staff?.role || role || "Unknown",
      officeId: staff?.office_id || payload?.office_id || null,
    };
  } catch {
    return { actor: "System", role: "System", officeId: null };
  }
}

export async function writeAuditLog(req, action, overrides = {}) {
  try {
    const base = await resolveActor(req);
    const userAgent = req?.headers?.get?.("user-agent") || "";
    await createGlobalAuditLog({
      actor: overrides.actor || base.actor,
      role: overrides.role || base.role,
      officeId: overrides.officeId || overrides.office_id || base.officeId || null,
      action: String(action || "").trim(),
      details: overrides.details || "",
      severity: overrides.severity || "INFO",
      user_agent: userAgent,
      entity_type: overrides.entity_type || "",
      entity_id: overrides.entity_id || "",
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
      officeId: overrides.officeId || overrides.office_id || base.officeId || null,
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

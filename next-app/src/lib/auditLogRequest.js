import { createGlobalAuditLog } from "./auditLogsRepo.js";
import { getSessionCookieName, verifySessionToken } from "./jwt.js";
import { getStaffById, getStaffFullName } from "./staffRepo.js";
import { queryOne } from "./postgres.js";
import { decryptPII } from "./piiEncryption.js";

export async function getStudentAuditName(accountId, studentNo) {
  if (!accountId && !studentNo) return null;
  const row = await queryOne(
    `SELECT sip.first_name, sip.last_name, sip.display_name
       FROM student_accounts sa
       JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
      WHERE ($1::bigint IS NOT NULL AND sa.id = $1::bigint)
         OR ($2::text IS NOT NULL AND sa.student_no = $2::text)
      LIMIT 1`,
    [Number.isSafeInteger(Number(accountId)) ? Number(accountId) : null, studentNo || null]
  ).catch(() => null);
  if (!row) return null;
  return [decryptPII(row.first_name), decryptPII(row.last_name)].filter(Boolean).join(" ").trim()
    || decryptPII(row.display_name) || null;
}

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

    if (!token) return { actor: "System", actor_id: null, role: "System", officeId: null };

    const payload = await verifySessionToken(token);
    const id = String(payload?.sub || "").trim();
    if (!id) return { actor: "System", actor_id: null, role: "System", officeId: null };

    const role = payload?.role || "";
    if (String(role).toLowerCase() === "student" || payload?.principal_type === "student" || payload?.student_no) {
      const studentActorId = payload?.student_no || payload?.account_id || id;
      const studentName = await getStudentAuditName(payload?.account_id || id, payload?.student_no);
      return {
        actor: studentName || payload?.student_no || payload?.username || id,
        actor_id: studentActorId,
        role: "Student",
        officeId: null,
      };
    }

    const staff = await getStaffById(id);
    return {
      actor: getStaffFullName(staff) || id,
      actor_id: id,
      role: staff?.role || role || "Unknown",
      officeId: staff?.office_id || payload?.office_id || null,
    };
  } catch {
    return { actor: "System", actor_id: null, role: "System", officeId: null };
  }
}

export async function writeAuditLog(req, action, overrides = {}) {
  try {
    const base = await resolveActor(req);
    const userAgent = req?.headers?.get?.("user-agent") || "";
    await createGlobalAuditLog({
      actor: overrides.actor || base.actor,
      actor_id: overrides.actor_id || overrides.actorId || base.actor_id || null,
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
      actor_id: overrides.actor_id || overrides.actorId || base.actor_id || null,
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

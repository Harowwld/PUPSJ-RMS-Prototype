import { query, queryOne } from "./postgres.js";
import { verifySessionToken } from "./jwt.js";

export async function registerSessionToken(token, {
  principalId,
  principalType = "staff",
  role = "Staff",
  username = null,
  authLevel = "password",
} = {}) {
  const payload = await verifySessionToken(token);
  const jti = String(payload?.jti || "").trim();
  const normalizedPrincipalId = String(principalId || payload?.sub || "").trim();
  const iat = Number(payload?.iat);
  const exp = Number(payload?.exp);
  if (!jti || !normalizedPrincipalId || !Number.isFinite(exp)) {
    throw new Error("Cannot register an incomplete session token");
  }

  await query(
    `INSERT INTO auth_sessions
       (jti, principal_id, principal_type, role, username, auth_level, created_at, last_active_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6,
             COALESCE(to_timestamp($7), NOW()), NOW(), to_timestamp($8))
     ON CONFLICT (jti) DO UPDATE SET
       principal_id = EXCLUDED.principal_id,
       principal_type = EXCLUDED.principal_type,
       role = EXCLUDED.role,
       username = EXCLUDED.username,
       auth_level = EXCLUDED.auth_level,
       expires_at = EXCLUDED.expires_at`,
    [
      jti,
      normalizedPrincipalId,
      String(principalType || "staff"),
      String(role || payload.role || "Staff"),
      username || payload.username || payload.email || null,
      String(authLevel || "password"),
      Number.isFinite(iat) ? iat : null,
      exp,
    ],
  );
  return { jti, principalId: normalizedPrincipalId, expiresAt: exp };
}

export async function touchSession(jti) {
  const normalizedJti = String(jti || "").trim();
  if (!normalizedJti) return false;
  const rows = await query(
    `UPDATE auth_sessions
        SET last_active_at = NOW()
      WHERE jti = $1 AND revoked_at IS NULL AND expires_at > NOW()
      RETURNING jti`,
    [normalizedJti],
  );
  return rows.length > 0;
}

export async function revokeSession(jti, { principalId = null, reason = "revoked" } = {}) {
  const normalizedJti = String(jti || "").trim();
  if (!normalizedJti) return false;

  await query(
    `INSERT INTO auth_session_revocations (jti, principal_id, reason)
     VALUES ($1, $2, $3)
     ON CONFLICT (jti) DO UPDATE SET reason = EXCLUDED.reason`,
    [normalizedJti, principalId ? String(principalId) : null, String(reason || "revoked")]
  );
  await query(
    `UPDATE auth_sessions
        SET revoked_at = COALESCE(revoked_at, NOW()), revoked_reason = $2
      WHERE jti = $1`,
    [normalizedJti, String(reason || "revoked")],
  );
  return true;
}

export async function isSessionRevoked(jti) {
  const normalizedJti = String(jti || "").trim();
  if (!normalizedJti) return false;
  const row = await queryOne(
    "SELECT jti FROM auth_session_revocations WHERE jti = $1",
    [normalizedJti]
  );
  return Boolean(row);
}

export async function isSessionActive(payload) {
  if (!payload?.sub || !payload?.jti) return false;
  if (await isSessionRevoked(payload.jti)) return false;
  const session = await queryOne(
    `SELECT principal_id, revoked_at, expires_at
       FROM auth_sessions
      WHERE jti = $1`,
    [String(payload.jti)],
  );
  if (!session || String(session.principal_id) !== String(payload.sub) || session.revoked_at) return false;
  if (session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) return false;
  await touchSession(payload.jti);
  if (payload.session_version === undefined) return true;
  return Number(payload.session_version) === await getSessionVersion(payload.sub);
}

export async function getActiveSessionCount() {
  const row = await queryOne(
    "SELECT COUNT(*)::int AS count FROM auth_sessions WHERE revoked_at IS NULL AND expires_at > NOW()",
  );
  return Number(row?.count || 0);
}

export async function getActiveSessions() {
  return await query(
    `SELECT principal_id AS "userId", role, username, auth_level AS "authLevel",
            created_at AS "loginTime", last_active_at AS "lastActivity",
            expires_at AS "expiresAt"
       FROM auth_sessions
      WHERE revoked_at IS NULL AND expires_at > NOW()
      ORDER BY last_active_at DESC`,
  );
}

export async function getSessionVersion(principalId) {
  const normalizedId = String(principalId || "").trim();
  if (!normalizedId) return 0;
  const row = await queryOne(
    "SELECT session_version FROM auth_session_versions WHERE principal_id = $1",
    [normalizedId],
  );
  return Number(row?.session_version || 0);
}

export async function bumpSessionVersion(principalId) {
  const normalizedId = String(principalId || "").trim();
  if (!normalizedId) return false;
  await query(
    `INSERT INTO auth_session_versions (principal_id, session_version, updated_at)
     VALUES ($1, 1, NOW())
     ON CONFLICT (principal_id) DO UPDATE
       SET session_version = auth_session_versions.session_version + 1,
           updated_at = NOW()`,
    [normalizedId],
  );
  return true;
}

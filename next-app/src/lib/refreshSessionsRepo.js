import { createHash, randomUUID } from "node:crypto";
import { transaction } from "./postgres.js";
import { signSessionToken, verifySessionToken } from "./jwt.js";
import { normalizeRole, isSystemAdminRole } from "./roleUtils.js";
import { decryptPII } from "./piiEncryption.js";

const FAMILY_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
const DUPLICATE_GRACE_SECONDS = 10;

export function hashRefreshToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function signRefreshToken(payload, expiresAt) {
  const claims = { ...payload };
  for (const name of ["exp", "iat", "nbf", "refresh_id"]) delete claims[name];
  return signSessionToken({ ...claims, purpose: "refresh", refresh_id: randomUUID() }, { expiresAt });
}

async function revokeFamily(tx, payload, reason) {
  await tx.query(
    `INSERT INTO auth_session_revocations (jti, principal_id, reason)
     VALUES ($1, $2, $3) ON CONFLICT (jti) DO UPDATE SET reason = EXCLUDED.reason`,
    [payload.jti, payload.sub, reason],
  );
  await tx.query(
    "UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, NOW()), revoked_reason = $2 WHERE jti = $1",
    [payload.jti, reason],
  );
}

export async function issueRefreshToken(accessToken) {
  const payload = await verifySessionToken(accessToken);
  if ((payload.purpose && payload.purpose !== "access") || !payload.jti || !payload.sub) {
    throw new Error("A full access session is required to issue refresh credentials");
  }
  const expiresAt = Math.floor(Date.now() / 1000) + FAMILY_LIFETIME_SECONDS;
  const token = await signRefreshToken(payload, expiresAt);
  await transaction(async (tx) => {
    const session = await tx.queryOne("SELECT * FROM auth_sessions WHERE jti = $1 FOR UPDATE", [payload.jti]);
    if (!session || session.revoked_at || String(session.principal_id) !== String(payload.sub) ||
        session.auth_level === "2fa-challenge") {
      throw new Error("A registered full session is required to issue refresh credentials");
    }
    const existing = await tx.queryOne("SELECT token_hash FROM auth_refresh_tokens WHERE session_jti = $1 LIMIT 1", [payload.jti]);
    if (existing) throw new Error("Refresh credentials have already been issued for this session");
    await tx.query("UPDATE auth_sessions SET expires_at = to_timestamp($2) WHERE jti = $1", [payload.jti, expiresAt]);
    await tx.query(
      "INSERT INTO auth_refresh_tokens (token_hash, session_jti, expires_at) VALUES ($1, $2, to_timestamp($3))",
      [hashRefreshToken(token), payload.jti, expiresAt],
    );
  });
  return { token, expiresAt };
}

async function currentClaims(tx, payload, session) {
  const version = await tx.queryOne("SELECT session_version FROM auth_session_versions WHERE principal_id = $1", [payload.sub]);
  if (Number(payload.session_version) !== Number(version?.session_version || 0)) return null;
  if (session.principal_type === "student") {
    const student = await tx.queryOne(
      `SELECT sa.id, sa.student_no, sa.status, sip.email, sip.client_type, s.status AS student_status
         FROM student_accounts sa JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
         LEFT JOIN students s ON s.student_no = sa.student_no WHERE sa.id::text = $1`,
      [String(payload.sub)],
    );
    if (!student || String(student.status).toLowerCase() !== "active" ||
        (student.student_status && String(student.student_status).toLowerCase() !== "active") ||
        normalizeRole(payload.role) !== "Student") return null;
    const email = student.email ? decryptPII(student.email) : null;
    return { sub: String(student.id), role: "Student", principal_type: "student", account_id: student.id,
      student_no: student.student_no || null, email, username: email || student.student_no,
      client_type: student.client_type || "Student", session_version: Number(version?.session_version || 0),
      mustChangePassword: Boolean(payload.mustChangePassword) };
  }
  const staff = await tx.queryOne("SELECT * FROM staff WHERE id = $1", [payload.sub]);
  const role = normalizeRole(staff?.role);
  if (!staff || staff.status !== "Active" || !role || role !== normalizeRole(payload.role)) return null;
  if (staff.office_id && !isSystemAdminRole(role)) {
    const office = await tx.queryOne("SELECT status FROM offices WHERE id = $1", [staff.office_id]);
    if (office?.status !== "Active") return null;
  }
  return { sub: staff.id, role, office_id: staff.office_id || null,
    username: staff.email ? decryptPII(staff.email) : null, last_active: staff.last_active,
    mustChangePassword: Boolean(payload.mustChangePassword), session_version: Number(version?.session_version || 0) };
}

export async function rotateRefreshToken(token) {
  const payload = await verifySessionToken(token).catch(() => null);
  if (payload?.purpose !== "refresh" || !payload.refresh_id || !payload.sub || !payload.jti ||
      !Number.isFinite(Number(payload.session_version))) return { status: 401, error: "Invalid refresh session" };
  return transaction(async (tx) => {
    // All rotations for a browser family serialize on the stable session ID.
    const session = await tx.queryOne("SELECT * FROM auth_sessions WHERE jti = $1 FOR UPDATE", [payload.jti]);
    const revoked = await tx.queryOne("SELECT jti FROM auth_session_revocations WHERE jti = $1", [payload.jti]);
    if (!session || revoked || session.revoked_at || String(session.principal_id) !== String(payload.sub) ||
        new Date(session.expires_at).getTime() <= Date.now() || session.auth_level === "2fa-challenge") {
      return { status: 401, error: "Refresh session ended" };
    }
    const stored = await tx.queryOne(
      `SELECT *, consumed_at > NOW() - ($3 * INTERVAL '1 second') AS recent_duplicate
         FROM auth_refresh_tokens WHERE token_hash = $1 AND session_jti = $2`,
      [hashRefreshToken(token), payload.jti, DUPLICATE_GRACE_SECONDS],
    );
    if (!stored || new Date(stored.expires_at).getTime() <= Date.now()) return { status: 401, error: "Invalid refresh session" };
    const claims = await currentClaims(tx, payload, session);
    if (!claims) {
      await revokeFamily(tx, payload, "refresh-account-invalid");
      return { status: 401, error: "Account or session changed; sign in again" };
    }
    if (stored.consumed_at) {
      if (stored.recent_duplicate) return { status: 409, error: "Session was renewed by another request; retry with current cookies" };
      // Return rather than throw so the replay revocation commits.
      await revokeFamily(tx, payload, "refresh-token-reused");
      return { status: 401, error: "Refresh credential reused; sign in again" };
    }
    const expiresAt = Math.floor(new Date(stored.expires_at).getTime() / 1000);
    const accessExpiresAt = Math.min(Math.floor(Date.now() / 1000) + 15 * 60, expiresAt);
    const accessToken = await signSessionToken({ ...claims, jti: payload.jti, auth_level: session.auth_level }, { expiresAt: accessExpiresAt });
    const refreshToken = await signRefreshToken({ ...claims, jti: payload.jti }, expiresAt);
    await tx.query("UPDATE auth_refresh_tokens SET consumed_at = NOW() WHERE token_hash = $1", [hashRefreshToken(token)]);
    await tx.query(
      "INSERT INTO auth_refresh_tokens (token_hash, session_jti, expires_at) VALUES ($1, $2, to_timestamp($3))",
      [hashRefreshToken(refreshToken), payload.jti, expiresAt],
    );
    await tx.query("UPDATE auth_sessions SET last_active_at = NOW(), role = $2, username = $3 WHERE jti = $1", [payload.jti, claims.role, claims.username]);
    return { status: 200, accessToken, refreshToken, expiresAt: accessExpiresAt, refreshExpiresAt: expiresAt };
  });
}

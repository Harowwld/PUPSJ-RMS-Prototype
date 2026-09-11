// Compatibility facade for the former process-local session store.
// Persistent session state is maintained in PostgreSQL by authSessions.js.
import { verifySessionToken } from "./jwt.js";
import { query } from "./postgres.js";
import {
  registerSessionToken,
  revokeSession,
  touchSession as touchPersistentSession,
  getActiveSessionCount as getPersistentActiveSessionCount,
  getActiveSessions as getPersistentActiveSessions,
} from "./authSessions.js";

export async function createSession(token, userId, role, username, options = {}) {
  return registerSessionToken(token, {
    principalId: userId,
    principalType: options.principalType || "staff",
    role,
    username,
    authLevel: options.authLevel || "password",
  });
}

export async function touchSession(token) {
  const payload = await verifySessionToken(token).catch(() => null);
  if (!payload?.jti) return null;
  return touchPersistentSession(payload.jti);
}

export async function removeSession(token) {
  const payload = await verifySessionToken(token).catch(() => null);
  if (!payload?.jti) return false;
  return revokeSession(payload.jti, { principalId: payload.sub, reason: "logout" });
}

export async function getSession(token) {
  const payload = await verifySessionToken(token).catch(() => null);
  return payload?.jti ? { jti: payload.jti, userId: payload.sub, role: payload.role } : null;
}

export async function cleanupExpiredSessions() {
  const rows = await query(
    "DELETE FROM auth_sessions WHERE expires_at <= NOW() RETURNING jti",
  );
  return rows.length;
}

export async function getActiveSessionCount() {
  return getPersistentActiveSessionCount();
}

export async function getActiveSessions() {
  return getPersistentActiveSessions();
}

// In-memory session store for tracking active sessions
// Maps session token → { userId, role, loginTime, lastActivity }

const sessions = new Map();

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function createSession(token, userId, role, username) {
  sessions.set(token, {
    userId,
    role,
    username,
    loginTime: Date.now(),
    lastActivity: Date.now(),
  });
  return sessions.get(token);
}

export function touchSession(token) {
  const session = sessions.get(token);
  if (session) {
    session.lastActivity = Date.now();
    return session;
  }
  return null;
}

export function removeSession(token) {
  return sessions.delete(token);
}

export function getSession(token) {
  return sessions.get(token) || null;
}

export function cleanupExpiredSessions() {
  const now = Date.now();
  let removed = 0;
  for (const [token, session] of sessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      sessions.delete(token);
      removed++;
    }
  }
  return removed;
}

export function getActiveSessionCount() {
  cleanupExpiredSessions();
  return sessions.size;
}

export function getActiveSessions() {
  cleanupExpiredSessions();
  return Array.from(sessions.values()).map((s) => ({
    userId: s.userId,
    role: s.role,
    username: s.username,
    loginTime: s.loginTime,
    lastActivity: s.lastActivity,
  }));
}

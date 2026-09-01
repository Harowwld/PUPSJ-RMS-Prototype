/**
 * Development-only authentication diagnostics.
 *
 * Never pass passwords, JWTs, cookies, recovery answers, or full request
 * bodies to this function. Set AUTH_DEBUG=true to enable it in production
 * temporarily when diagnosing an issue.
 */
export function authDebug(event, details = {}) {
  if (process.env.NODE_ENV === "production" && process.env.AUTH_DEBUG !== "true") return;
  console.info(`[auth-debug] ${event}`, details);
}

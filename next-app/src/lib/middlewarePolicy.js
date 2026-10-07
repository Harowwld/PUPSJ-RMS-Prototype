import { verifySessionToken } from "./jwt.js";

const PUBLIC_SESSION_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/login-options",
  "/api/auth/demo-login",
  "/api/auth/login/verify-2fa",
  "/api/auth/student/login",
  "/api/auth/student/register",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/refresh",
  "/api/auth/forgot-password/identify",
  "/api/auth/forgot-password/reset",
]);

export function isPublicSessionPath(pathname) {
  return PUBLIC_SESSION_PATHS.has(String(pathname || ""));
}

export async function resolveMiddlewareSession(accessToken, refreshToken, { allowRefresh = false } = {}) {
  const access = accessToken ? await verifySessionToken(accessToken).catch(() => null) : null;
  if (access && (!access.purpose || access.purpose === "access")) return access;
  if (!allowRefresh || !refreshToken) return null;
  const refresh = await verifySessionToken(refreshToken).catch(() => null);
  return refresh?.purpose === "refresh" ? refresh : null;
}

const PUBLIC_SESSION_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/login/verify-2fa",
  "/api/auth/student/login",
  "/api/auth/student/register",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/forgot-password/identify",
  "/api/auth/forgot-password/reset",
]);

export function isPublicSessionPath(pathname) {
  return PUBLIC_SESSION_PATHS.has(String(pathname || ""));
}

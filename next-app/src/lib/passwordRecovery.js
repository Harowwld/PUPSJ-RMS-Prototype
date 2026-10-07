export function getPasswordRecoveryOrigin(requestUrl) {
  const configuredUrl = String(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim();
  const url = new URL(configuredUrl || requestUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Password recovery requires a valid HTTP(S) application URL.");
  }
  if (!configuredUrl && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("APP_URL must be configured for password recovery.");
  }
  return url.origin;
}

export function createPasswordResetUrl(origin, resetToken) {
  const url = new URL("/forgot-password", origin);
  // Fragments stay in the browser, keeping the token out of request URLs and referrers.
  url.hash = new URLSearchParams({ token: resetToken }).toString();
  return url.toString();
}

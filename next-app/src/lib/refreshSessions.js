import { getRefreshCookieName, getSessionCookieName, verifySessionToken } from "./jwt.js";
import { issueRefreshToken } from "./refreshSessionsRepo.js";
import { setCSRFTokenCookie, isAllowedOrigin } from "./csrfProtection.js";
import { shouldUseSecureCookie } from "./cookieSecurity.js";

export function noStoreAuthResponse(response) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export function isRefreshRequestAllowed(req) {
  return req.headers.get("x-session-refresh") === "1" && isAllowedOrigin(req);
}

export function setRefreshCookies(response, accessToken, refreshToken, refreshExpiresAt, req) {
  const options = { httpOnly: true, sameSite: "lax", secure: shouldUseSecureCookie(req), path: "/" };
  response.cookies.set({ ...options, name: getSessionCookieName(), value: accessToken });
  response.cookies.set({ ...options, name: getRefreshCookieName(), value: refreshToken,
    expires: new Date(refreshExpiresAt * 1000), maxAge: Math.max(0, refreshExpiresAt - Math.floor(Date.now() / 1000)) });
  return noStoreAuthResponse(setCSRFTokenCookie(response, accessToken, req));
}

export async function attachRefreshSession(response, accessToken, req) {
  const { token, expiresAt } = await issueRefreshToken(accessToken);
  return setRefreshCookies(response, accessToken, token, expiresAt, req);
}

export async function getLogoutPayload(req) {
  const access = await verifySessionToken(req.cookies.get(getSessionCookieName())?.value || "").catch(() => null);
  if (access && (!access.purpose || access.purpose === "access")) return access;
  const refresh = await verifySessionToken(req.cookies.get(getRefreshCookieName())?.value || "").catch(() => null);
  return refresh?.purpose === "refresh" ? refresh : null;
}

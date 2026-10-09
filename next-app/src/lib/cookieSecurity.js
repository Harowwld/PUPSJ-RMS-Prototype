import { getSessionCookieName, getRefreshCookieName } from "./jwt.js";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalhostRequest(req) {
  let hostname = String(req?.nextUrl?.hostname || "").toLowerCase();
  if (!hostname) {
    try {
      hostname = new URL(req?.url || "").hostname.toLowerCase();
    } catch {
      return false;
    }
  }
  return LOCAL_HOSTS.has(hostname.replace(/^\[|\]$/g, ""));
}

export function shouldUseSecureCookie(req) {
  if (process.env.NODE_ENV !== "production") return false;

  const forwardedProtocol = req?.headers?.get?.("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  if (forwardedProtocol) return forwardedProtocol === "https";

  try {
    if (req?.url) {
      return new URL(req.url).protocol === "https:";
    }
  } catch {
    // ignore
  }

  return false;
}

export function clearAuthCookies(response, req) {
  if (!response?.cookies) return response;
  const cookieNames = Array.from(
    new Set([
      getSessionCookieName(),
      getRefreshCookieName(),
      "pup_session",
      "pup_refresh",
      "pup_auth_token",
      "pup_csrf",
    ])
  );
  const secure = shouldUseSecureCookie(req);
  for (const name of cookieNames) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: name !== "pup_csrf",
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  }
  return response;
}


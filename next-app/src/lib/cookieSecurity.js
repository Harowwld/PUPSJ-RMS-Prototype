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
  if (!isLocalhostRequest(req)) return true;

  const forwardedProtocol = req?.headers?.get?.("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  if (forwardedProtocol) return forwardedProtocol === "https";

  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return true;
  }
}

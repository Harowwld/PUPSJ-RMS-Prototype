import { NextResponse } from "next/server";
import { getSessionCookieName, getRefreshCookieName } from "./src/lib/jwt";
import { isPublicSessionPath, resolveMiddlewareSession } from "./src/lib/middlewarePolicy.js";
import { canAccessPage, normalizeRole } from "./src/lib/roleUtils.js";
import { clearAuthCookies } from "./src/lib/cookieSecurity.js";

function constantTimeEqual(a, b) {
  const sa = String(a || "");
  const sb = String(b || "");
  let diff = sa.length ^ sb.length;
  const max = Math.max(sa.length, sb.length);
  for (let i = 0; i < max; i += 1) {
    diff |= (sa.charCodeAt(i) || 0) ^ (sb.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function createRequestNonce() {
  return btoa(crypto.randomUUID());
}

function contentSecurityPolicy(nonce) {
  const developmentScriptPolicy = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  return `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentScriptPolicy}; style-src 'self' 'nonce-${nonce}'; style-src-attr 'none'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob: data:; object-src 'self' blob: data:; frame-ancestors 'self'; base-uri 'self'; form-action 'self';`;
}

function continueWithNonce(req, nonce) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function addSecurityHeaders(response, nonce) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', contentSecurityPolicy(nonce));
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const method = String(req.method || "GET").toUpperCase();
  const nonce = createRequestNonce();

  // 1. Hot-folder ingest auth
  if (pathname === "/api/ingest/hot-folder" && method === "POST") {
    const authHeader = req.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = (match?.[1] || "").trim();
    const expected = String(process.env.HOT_FOLDER_INGEST_TOKEN || "").trim();
    if (!expected || !token || !constantTimeEqual(token, expected)) {
      return addSecurityHeaders(NextResponse.json({ ok: false, error: "Invalid ingest token" }, { status: 401 }), nonce);
    }
    return addSecurityHeaders(continueWithNonce(req, nonce), nonce);
  }

  // 2. Allow specific auth endpoints to skip session check
  // Note: Rate limiting for these is handled within the route handlers to avoid Edge Runtime issues
  if (isPublicSessionPath(pathname, method)) {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(NextResponse.next(), nonce);
    }
    return addSecurityHeaders(continueWithNonce(req, nonce), nonce);
  }

  // 3. Public routes
  if (pathname === "/" || pathname === "/login") {
    return addSecurityHeaders(continueWithNonce(req, nonce), nonce);
  }

  // The student portal is a public login/register entry point when there is
  // no session. Authenticated users still pass through the normal role gate.
  if ((pathname === "/student" || pathname.startsWith("/student/")) &&
      !req.cookies.get(getSessionCookieName())?.value && !req.cookies.get(getRefreshCookieName())?.value) {
    return addSecurityHeaders(continueWithNonce(req, nonce), nonce);
  }

  // 4. Session validation for all other protected routes
  const token = req.cookies.get(getSessionCookieName())?.value || "";
  const payload = await resolveMiddlewareSession(token, req.cookies.get(getRefreshCookieName())?.value,
    { allowRefresh: !pathname.startsWith("/api/") });
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 }), nonce);
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    const redirectRes = NextResponse.redirect(url);
    if (token || req.cookies.get(getRefreshCookieName())?.value) {
      clearAuthCookies(redirectRes, req);
    }
    return addSecurityHeaders(redirectRes, nonce);
  }

  if (!pathname.startsWith("/api/") && !canAccessPage(pathname, payload?.role)) {
    const url = req.nextUrl.clone();
    const role = normalizeRole(payload?.role);
    if (role === "SystemAdmin" || role === "SuperAdmin") {
      url.pathname = "/systemadmin";
    } else if (role === "Admin") {
      url.pathname = "/admin";
    } else if (role === "Staff") {
      url.pathname = "/staff";
    } else if (role === "Student") {
      url.pathname = "/student";
    } else {
      url.pathname = "/login";
    }
    return addSecurityHeaders(NextResponse.redirect(url), nonce);
  }

  // Route handlers resolve the current principal and office from the request
  // cookie. Middleware payload claims are only used for coarse redirects.
  if (pathname.startsWith("/api/")) {
    return addSecurityHeaders(NextResponse.next(), nonce);
  }
  return addSecurityHeaders(continueWithNonce(req, nonce), nonce);
}

export const config = {
  matcher: [
    "/systemadmin/:path*",
    "/superadmin/:path*",
    "/admin/:path*", 
    "/staff/:path*", 
    "/student/:path*",
    "/api/:path*", 
    "/account",
    "/account/:path*"
  ],
};

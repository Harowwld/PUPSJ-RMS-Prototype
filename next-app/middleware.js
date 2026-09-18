import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "./src/lib/jwt";
import { isPublicSessionPath } from "./src/lib/middlewarePolicy.js";
import { canAccessPage } from "./src/lib/roleUtils.js";

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

function continueWithNonce(req, nonce) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function addSecurityHeaders(response, nonce) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'nonce-${nonce}'; style-src-attr 'none'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`);
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
  if (isPublicSessionPath(pathname)) {
    return addSecurityHeaders(continueWithNonce(req, nonce), nonce);
  }

  // 3. Public routes
  if (pathname === "/" || pathname === "/login") {
    return addSecurityHeaders(continueWithNonce(req, nonce), nonce);
  }

  // The student portal is a public login/register entry point when there is
  // no session. Authenticated users still pass through the normal role gate.
  if ((pathname === "/student" || pathname.startsWith("/student/")) &&
      !req.cookies.get(getSessionCookieName())?.value) {
    return addSecurityHeaders(continueWithNonce(req, nonce), nonce);
  }

  // 4. Session validation for all other protected routes
  const token = req.cookies.get(getSessionCookieName())?.value || "";
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(NextResponse.json({ ok: false, error: "Not authenticated (Middleware)" }, { status: 401 }), nonce);
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return addSecurityHeaders(NextResponse.redirect(url), nonce);
  }

  let payload;
  try {
    payload = await verifySessionToken(token);
  } catch (err) {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 }), nonce);
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return addSecurityHeaders(NextResponse.redirect(url), nonce);
  }

  if (!pathname.startsWith("/api/") && !canAccessPage(pathname, payload?.role)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return addSecurityHeaders(NextResponse.redirect(url), nonce);
  }

  // Route handlers resolve the current principal and office from the request
  // cookie. Middleware payload claims are only used for coarse redirects.
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

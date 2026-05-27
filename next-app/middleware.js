import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "./src/lib/jwt";

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

function addSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';");
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const method = String(req.method || "GET").toUpperCase();

  // 1. Hot-folder ingest auth
  if (pathname === "/api/ingest/hot-folder" && method === "POST") {
    const authHeader = req.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = (match?.[1] || "").trim();
    const expected = String(process.env.HOT_FOLDER_INGEST_TOKEN || "").trim();
    if (!expected || !token || !constantTimeEqual(token, expected)) {
      return addSecurityHeaders(NextResponse.json({ ok: false, error: "Invalid ingest token" }, { status: 401 }));
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // 2. Allow specific auth endpoints to skip session check
  // Note: Rate limiting for these is handled within the route handlers to avoid Edge Runtime issues
  if (
    pathname.startsWith("/api/auth/login") || 
    pathname.startsWith("/api/auth/logout") ||
    pathname.startsWith("/api/auth/me") ||
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname === "/api/system/reset-db"
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  // 3. Public routes
  if (pathname === "/") {
    return addSecurityHeaders(NextResponse.next());
  }

  // 4. Session validation for all other protected routes
  const token = req.cookies.get(getSessionCookieName())?.value || "";
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(NextResponse.json({ ok: false, error: "Not authenticated (Middleware)" }, { status: 401 }));
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  let payload;
  try {
    payload = await verifySessionToken(token);
  } catch (err) {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(NextResponse.json({ ok: false, error: "Invalid session (Middleware): " + err.message }, { status: 401 }));
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  const role = String(payload?.role || "").toLowerCase().trim();
  const isAdmin = ["admin", "administrator", "superadmin"].includes(role);

  // 5. Role-based routing
  if (pathname.startsWith("/admin")) {
    if (!isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/staff";
      return addSecurityHeaders(NextResponse.redirect(url));
    }
  }

  if (pathname.startsWith("/staff") || pathname.startsWith("/account")) {
    if (!role) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return addSecurityHeaders(NextResponse.redirect(url));
    }
  }

  return addSecurityHeaders(NextResponse.next());
}


export const config = {
  matcher: [
    "/admin/:path*", 
    "/staff/:path*", 
    "/api/:path*", 
    "/account/:path*"
  ],
};


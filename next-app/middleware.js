import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "./src/lib/jwt";
import { rateLimitMiddleware } from "./src/lib/rateLimitMiddleware";

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

  // 1. Apply Rate Limiting
  const rateLimitResponse = await rateLimitMiddleware(req);
  
  // Helper to ensure we keep rate limit headers and add security ones
  const finalize = (res) => {
    // Copy headers from rateLimitResponse to the new response
    rateLimitResponse.headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith('x-ratelimit-') || key.toLowerCase() === 'retry-after') {
        res.headers.set(key, value);
      }
    });
    return addSecurityHeaders(res);
  };

  if (rateLimitResponse.status === 429 || rateLimitResponse.status === 403) {
    return finalize(rateLimitResponse);
  }

  // 2. Hot-folder ingest auth
  if (pathname === "/api/ingest/hot-folder" && method === "POST") {
    const authHeader = req.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = (match?.[1] || "").trim();
    const expected = String(process.env.HOT_FOLDER_INGEST_TOKEN || "").trim();
    if (!expected || !token || !constantTimeEqual(token, expected)) {
      return finalize(NextResponse.json({ ok: false, error: "Invalid ingest token" }, { status: 401 }));
    }
    return finalize(NextResponse.next());
  }

  // 3. Allow specific auth endpoints to skip session check
  if (
    pathname.startsWith("/api/auth/login") || 
    pathname.startsWith("/api/auth/logout") ||
    pathname.startsWith("/api/auth/me") ||
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname === "/api/system/reset-db"
  ) {
    return finalize(rateLimitResponse);
  }

  // 4. Public routes
  if (pathname === "/") {
    return finalize(rateLimitResponse);
  }

  // 5. Session validation for all other protected routes
  const token = req.cookies.get(getSessionCookieName())?.value || "";
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return finalize(NextResponse.json({ ok: false, error: "Not authenticated (Middleware)" }, { status: 401 }));
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return finalize(NextResponse.redirect(url));
  }

  let payload;
  try {
    payload = await verifySessionToken(token);
  } catch (err) {
    if (pathname.startsWith("/api/")) {
      return finalize(NextResponse.json({ ok: false, error: "Invalid session (Middleware): " + err.message }, { status: 401 }));
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return finalize(NextResponse.redirect(url));
  }

  const role = String(payload?.role || "");

  // 6. Role-based routing
  if (pathname.startsWith("/admin")) {
    if (role !== "Admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/staff";
      return finalize(NextResponse.redirect(url));
    }
  }

  if (pathname.startsWith("/staff") || pathname.startsWith("/account")) {
    if (!role) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return finalize(NextResponse.redirect(url));
    }
  }

  // Success: Pass through with rate limit headers and security headers
  return finalize(rateLimitResponse);
}

export const config = {
  matcher: [
    "/admin/:path*", 
    "/staff/:path*", 
    "/api/:path*", 
    "/account/:path*"
  ],
};


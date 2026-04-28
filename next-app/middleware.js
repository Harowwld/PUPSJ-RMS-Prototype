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

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const method = String(req.method || "GET").toUpperCase();

  if (pathname === "/api/ingest/hot-folder" && method === "POST") {
    const authHeader = req.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = (match?.[1] || "").trim();
    const expected = String(process.env.HOT_FOLDER_INGEST_TOKEN || "").trim();
    if (!expected || !token || !constantTimeEqual(token, expected)) {
      return NextResponse.json({ ok: false, error: "Invalid ingest token" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Allow auth endpoints without session or with their own checks
  if (
    pathname.startsWith("/api/auth/login") || 
    pathname.startsWith("/api/auth/logout") ||
    pathname.startsWith("/api/auth/me") ||
    pathname.startsWith("/api/auth/forgot-password")
  ) {
    return NextResponse.next();
  }

  // Public routes
  if (pathname === "/") {
    return NextResponse.next();
  }

  const token = req.cookies.get(getSessionCookieName())?.value || "";
  if (!token) {
    console.log(`[Middleware] No token found for ${pathname}`);
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "Not authenticated (Middleware)" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  let payload;
  try {
    payload = await verifySessionToken(token);
  } catch (err) {
    console.log(`[Middleware] Token verification failed for ${pathname}: ${err.message}`);
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "Invalid session (Middleware): " + err.message }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const role = String(payload?.role || "");

  if (pathname.startsWith("/admin")) {
    if (role !== "Admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/staff";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/staff")) {
    if (!role) {
      console.log(`[Middleware] Unauthorized staff access attempt for ${pathname}`);
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/account")) {
    if (!role) {
      console.log(`[Middleware] Unauthorized account access attempt for ${pathname}`);
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // For API routes, require any authenticated user
  if (pathname.startsWith("/api/")) {
    const token = req.cookies.get(getSessionCookieName())?.value || "";
    if (!token) {
      console.log(`[Middleware] No token found for API route ${pathname}`);
      const response = NextResponse.json({ ok: false, error: "Not authenticated (Middleware)" }, { status: 401 });
      // Add security headers to error response
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';");
      response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      return response;
    }

    let payload;
    try {
      payload = await verifySessionToken(token);
    } catch (err) {
      console.log(`[Middleware] Token verification failed for API ${pathname}: ${err.message}`);
      const response = NextResponse.json({ ok: false, error: "Invalid session (Middleware): " + err.message }, { status: 401 });
      // Add security headers to error response
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';");
      response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      return response;
    }

    // Add comprehensive security headers for successful API requests
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';");
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*", 
    "/staff/:path*", 
    "/api/:path*", 
    "/account/:path*"
  ],
};

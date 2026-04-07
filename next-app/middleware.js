import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "./src/lib/jwt";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

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
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // For API routes, require any authenticated user
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/api/:path*"],
};

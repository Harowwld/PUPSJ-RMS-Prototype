import assert from "node:assert/strict";
import test from "node:test";
import { isAuthMeRequest, getAuthenticatedPrincipal } from "../../src/lib/authHelpers.js";
import { clearAuthCookies } from "../../src/lib/cookieSecurity.js";
import { NextResponse } from "next/server.js";

test("isAuthMeRequest accurately detects /api/auth/me across request shapes", () => {
  assert.equal(isAuthMeRequest(new Request("http://localhost:3000/api/auth/me")), true);
  assert.equal(isAuthMeRequest(new Request("https://rms.pup.edu/api/auth/me?format=json")), true);
  assert.equal(isAuthMeRequest({ nextUrl: { pathname: "/api/auth/me" } }), true);
  assert.equal(isAuthMeRequest({ url: "/api/auth/me" }), true);

  assert.equal(isAuthMeRequest(new Request("http://localhost:3000/api/documents")), false);
  assert.equal(isAuthMeRequest(new Request("http://localhost:3000/api/auth/login")), false);
  assert.equal(isAuthMeRequest(new Request("http://localhost:3000/api/auth/refresh")), false);
  assert.equal(isAuthMeRequest({ nextUrl: { pathname: "/admin" } }), false);
});

test("clearAuthCookies eagerly expires all core authentication cookies", () => {
  const cleared = [];
  const fakeResponse = {
    cookies: {
      set(options) {
        cleared.push(options);
      },
    },
  };

  clearAuthCookies(fakeResponse);

  const clearedNames = cleared.map((c) => c.name);
  assert.ok(clearedNames.includes("pup_session"), "clears pup_session");
  assert.ok(clearedNames.includes("pup_refresh"), "clears pup_refresh");
  assert.ok(clearedNames.includes("pup_csrf"), "clears pup_csrf");
  assert.ok(clearedNames.includes("pup_auth_token"), "clears pup_auth_token");

  for (const cookie of cleared) {
    assert.equal(cookie.value, "", `cookie ${cookie.name} has empty value`);
    assert.equal(cookie.maxAge, 0, `cookie ${cookie.name} has maxAge 0`);
    assert.equal(cookie.path, "/", `cookie ${cookie.name} path is /`);
    assert.equal(cookie.expires.getTime(), 0, `cookie ${cookie.name} expires in the past`);
    if (cookie.name === "pup_csrf") {
      assert.equal(cookie.httpOnly, false, "pup_csrf is not httpOnly");
    } else {
      assert.equal(cookie.httpOnly, true, `${cookie.name} is httpOnly`);
    }
  }
});

test("clearAuthCookies works cleanly with Next.js NextResponse", () => {
  const res = NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  clearAuthCookies(res);
  const setCookieHeaders = res.headers.getSetCookie();
  assert.ok(setCookieHeaders.length >= 4, "Set-Cookie headers added for all auth cookies");
  assert.ok(setCookieHeaders.some((h) => h.startsWith("pup_session=;")));
  assert.ok(setCookieHeaders.some((h) => h.startsWith("pup_refresh=;")));
});

test("getAuthenticatedPrincipal returns null without throwing on missing or dead token", async () => {
  // Probe /api/auth/me without cookies
  const meReqNoCookie = new Request("http://localhost:3000/api/auth/me");
  const resultNoCookie = await getAuthenticatedPrincipal(meReqNoCookie);
  assert.equal(resultNoCookie, null);

  // Probe /api/auth/me with an invalid session cookie
  const meReqDeadCookie = new Request("http://localhost:3000/api/auth/me", {
    headers: {
      cookie: "pup_session=invalid.bogus.jwt.token",
    },
  });
  const resultDeadCookie = await getAuthenticatedPrincipal(meReqDeadCookie);
  assert.equal(resultDeadCookie, null);
});

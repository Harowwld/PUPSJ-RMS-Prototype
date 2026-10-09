import assert from "node:assert/strict";
import test from "node:test";
import { isPublicSessionPath } from "../src/lib/middlewarePolicy.js";
import { normalizeRole, canAccessPage } from "../src/lib/roleUtils.js";

// Canonical status calculation function from createAuthErrorResponse in authHelpers.js
function calculateAuthStatus(error, status = 401) {
  const message = String(error || "").trim().toLowerCase();
  const isAuthenticationFailure = message === "unauthorized" ||
    message.includes("authentication required") ||
    message.includes("invalid or missing session") ||
    message.includes("invalid session") ||
    message.includes("missing session");
  const isAuthorizationFailure = message === "forbidden" || message.includes("access denied") || message.includes("required role");
  return isAuthenticationFailure ? 401 : isAuthorizationFailure ? 403 : status;
}

test("isPublicSessionPath correctly exempts public endpoints", () => {
  // Public auth paths (any method)
  assert.equal(isPublicSessionPath("/api/auth/login", "POST"), true);
  assert.equal(isPublicSessionPath("/api/auth/logout", "POST"), true);
  assert.equal(isPublicSessionPath("/api/public/track-request", "GET"), true);

  // Landing page CMS GET requests should be public
  assert.equal(isPublicSessionPath("/api/landing/hero", "GET"), true);
  assert.equal(isPublicSessionPath("/api/landing/bento", "GET"), true);
  assert.equal(isPublicSessionPath("/api/landing/faq", "GET"), true);
  assert.equal(isPublicSessionPath("/api/landing/catalog", "GET"), true);
  assert.equal(isPublicSessionPath("/api/landing/footer", "GET"), true);
  assert.equal(isPublicSessionPath("/api/landing/workflow", "GET"), true);

  // Landing page CMS mutations (PUT/POST) must NOT skip middleware session check
  assert.equal(isPublicSessionPath("/api/landing/hero", "PUT"), false);
  assert.equal(isPublicSessionPath("/api/landing/upload", "POST"), false);

  // Protected administrative and staff routes must NOT skip session check
  assert.equal(isPublicSessionPath("/api/staff", "GET"), false);
  assert.equal(isPublicSessionPath("/api/students", "GET"), false);
  assert.equal(isPublicSessionPath("/api/documents", "GET"), false);
  assert.equal(isPublicSessionPath("/api/system/reset-db", "POST"), false);
  assert.equal(isPublicSessionPath("/api/system/backup/schedule", "GET"), false);
});

test("calculateAuthStatus produces accurate 401 vs 403 status codes", () => {
  // 401: Authentication failures (unauthenticated, missing/invalid token)
  assert.equal(calculateAuthStatus("Authentication required"), 401);
  assert.equal(calculateAuthStatus("Invalid or missing session"), 401);
  assert.equal(calculateAuthStatus("Missing session token"), 401);
  assert.equal(calculateAuthStatus("Student authentication required"), 401);

  // 403: Authorization failures (authenticated but lacking permissions or role)
  assert.equal(calculateAuthStatus("Access denied. Required role: Admin or SystemAdmin"), 403);
  assert.equal(calculateAuthStatus("Forbidden"), 403);
  assert.equal(calculateAuthStatus("You cannot access that office", 403), 403);
});

test("Role normalization and hierarchy prevents role leakage", () => {
  assert.equal(normalizeRole("Student"), "Student");
  assert.equal(normalizeRole("Staff"), "Staff");
  assert.equal(normalizeRole("Admin"), "Admin");
  assert.equal(normalizeRole("SystemAdmin"), "SystemAdmin");
  assert.equal(normalizeRole("SuperAdmin"), "SuperAdmin");

  // Students cannot access Staff, Admin, or SystemAdmin pages
  assert.equal(canAccessPage("/staff", "Student"), false);
  assert.equal(canAccessPage("/admin", "Student"), false);
  assert.equal(canAccessPage("/systemadmin", "Student"), false);

  // Staff cannot access Admin or SystemAdmin pages
  assert.equal(canAccessPage("/admin", "Staff"), false);
  assert.equal(canAccessPage("/systemadmin", "Staff"), false);

  // Admin cannot access SystemAdmin pages
  assert.equal(canAccessPage("/systemadmin", "Admin"), false);

  // Shared /account page allows both Student and Staff
  assert.equal(canAccessPage("/account", "Student"), true);
  assert.equal(canAccessPage("/account", "Staff"), true);
  assert.equal(canAccessPage("/account", "Admin"), true);
});

import test from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = process.env.JWT_SECRET || "pupsj-rms-local-test-jwt-secret-string-at-least-32-chars";

const { signSessionToken, verifySessionToken } = await import("../../src/lib/jwt.js");
const { canAccessPage } = await import("../../src/lib/roleUtils.js");
const { hashPassword, verifyPasswordHash } = await import("../../src/lib/passwordHash.js");
const { ForgotPasswordResetSchema } = await import("../../src/lib/authSchemas.js");

test("Module 1.1: Authentication - Valid credentials generate an authenticated session token", async () => {
  const userPayload = {
    sub: "STAFF-001",
    role: "Staff",
    username: "marcus.reyes",
    email: "staff.registrar@pup.local",
  };

  const token = await signSessionToken(userPayload, { expiresIn: "1h" });
  assert.ok(typeof token === "string" && token.length > 20, "Token should be a non-empty signed JWT string");

  const verified = await verifySessionToken(token);
  assert.equal(verified.sub, userPayload.sub);
  assert.equal(verified.role, userPayload.role);
  assert.equal(verified.username, userPayload.username);
  assert.equal(verified.email, userPayload.email);
});

test("Module 1.2: RBAC - Role-restricted endpoints block unauthorized access", () => {
  // Staff cannot access Admin or SystemAdmin routes
  assert.equal(canAccessPage("/admin", "Staff"), false, "Staff should not access /admin");
  assert.equal(canAccessPage("/systemadmin", "Staff"), false, "Staff should not access /systemadmin");
  assert.equal(canAccessPage("/staff", "Staff"), true, "Staff should access /staff");

  // Admin can access /admin and /staff, but not /systemadmin
  assert.equal(canAccessPage("/admin", "Admin"), true, "Admin should access /admin");
  assert.equal(canAccessPage("/staff", "Admin"), true, "Admin should access /staff");
  assert.equal(canAccessPage("/systemadmin", "Admin"), false, "Admin should not access /systemadmin");

  // SuperAdmin can access /systemadmin
  assert.equal(canAccessPage("/systemadmin", "SuperAdmin"), true, "SuperAdmin should access /systemadmin");

  // Unauthenticated users cannot access protected routes
  assert.equal(canAccessPage("/account", null, { authenticated: false }), false, "Unauthenticated user cannot access /account");
});

test("Module 1.3: Password Security - Hashing and recovery workflows validate properly", async () => {
  const plainPassword = "SecurePassword123!";
  const hash = hashPassword(plainPassword);

  assert.ok(hash && typeof hash === "string", "Password hash must be a valid string");
  assert.notEqual(hash, plainPassword, "Hash must never equal plaintext password");
  const validRes = verifyPasswordHash(plainPassword, hash);
  assert.equal(typeof validRes === "object" ? validRes.valid : validRes, true, "Password verification must succeed for matching password");
  const invalidRes = verifyPasswordHash("WrongPassword!", hash);
  assert.equal(typeof invalidRes === "object" ? invalidRes.valid : invalidRes, false, "Password verification must fail for mismatched password");

  // Recovery schema validation
  const validReset = ForgotPasswordResetSchema.safeParse({
    id: "STAFF-001",
    questionId: 1,
    answer: "Mother Maiden Name",
    newPassword: "NewPassword2026!",
  });
  assert.equal(validReset.success, true, "Valid recovery payload must pass validation");

  const invalidReset = ForgotPasswordResetSchema.safeParse({
    id: "STAFF-001",
    questionId: 1,
    answer: "",
    newPassword: "123", // Too short
  });
  assert.equal(invalidReset.success, false, "Invalid password reset payload must be rejected");
});

test("Module 1.4: Session Security - Invalid, expired, and tampered tokens fail securely", async () => {
  // Tampered token
  const validToken = await signSessionToken({ sub: "STAFF-001", role: "Staff" });
  const tamperedToken = validToken.slice(0, -6) + "xxxxxx";

  await assert.rejects(
    async () => verifySessionToken(tamperedToken),
    /signature verification failed|JWS/i,
    "Tampered token must fail signature verification"
  );

  // Expired token (0s expiry)
  const expiredToken = await signSessionToken({ sub: "STAFF-001", role: "Staff" }, { expiresIn: "0s" });
  // Small pause to guarantee expiry
  await new Promise((resolve) => setTimeout(resolve, 50));

  await assert.rejects(
    async () => verifySessionToken(expiredToken),
    /claim is expired|expired/i,
    "Expired token must be rejected"
  );
});

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import speakeasy from "speakeasy";
import {
  generateTOTPSecret,
  encryptSecret,
  decryptSecret,
  verifyTOTP,
  isValidToken,
} from "../src/lib/totp.js";
import { extractTOTPToken } from "../src/lib/totpMiddleware.js";

describe("TOTP Core & Cross-Platform Reliability", () => {
  const originalEnv = { ...process.env };

  before(() => {
    process.env.JWT_SECRET = "test-jwt-secret-for-totp-testing-123456789";
    process.env.TOTP_SECRET_KEY = "test-dedicated-totp-secret-key-abcdef";
    process.env.TOTP_WINDOW = "2";
  });

  after(() => {
    process.env = originalEnv;
  });

  test("generateTOTPSecret produces standard 20-byte base32 secret and RFC 6238 Key URI", () => {
    const email = "admin.registrar@pup.local";
    const issuer = "PUPSJ Records Keeping System";
    const { secret, otpauthUrl } = generateTOTPSecret(email, issuer);

    assert.ok(secret, "Secret must be generated");
    assert.match(secret, /^[A-Z2-7]+=*$/, "Secret must be valid base32 string");
    // 20 bytes in base32 is 32 characters (unpadded)
    assert.strictEqual(secret.replace(/=/g, "").length, 32, "20-byte secret in base32 must be 32 chars");

    assert.ok(otpauthUrl, "otpauthUrl must be generated");
    assert.ok(otpauthUrl.startsWith("otpauth://totp/"), "Must be a totp:// protocol URI");
    assert.ok(otpauthUrl.includes(`secret=${secret}`), "Must embed base32 secret");
    assert.ok(otpauthUrl.includes("issuer="), "Must contain explicit issuer parameter");
    assert.ok(otpauthUrl.includes(encodeURIComponent(email)), "Must include encoded email");
  });

  test("encryptSecret and decryptSecret round-trip correctly", () => {
    const rawSecret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
    const encrypted = encryptSecret(rawSecret);

    assert.ok(encrypted, "Encrypted string must not be null");
    assert.ok(encrypted.includes(":"), "Must be in iv:ciphertext format");

    const parts = encrypted.split(":");
    assert.strictEqual(parts[0].length, 32, "IV in hex must be 32 chars (16 bytes)");

    const decrypted = decryptSecret(encrypted);
    assert.strictEqual(decrypted, rawSecret, "Decrypted secret must match original");
  });

  test("decryptSecret gracefully handles invalid, corrupted, or tampered inputs without throwing", () => {
    assert.strictEqual(decryptSecret(null), null);
    assert.strictEqual(decryptSecret(""), null);
    assert.strictEqual(decryptSecret("not-a-valid-format"), null);
    assert.strictEqual(decryptSecret("shortiv:deadbeef"), null); // Invalid IV length
    assert.strictEqual(decryptSecret("00112233445566778899aabbccddeeff:invalidciphertext"), null); // Tampered payload
  });

  test("decryptSecret falls back to JWT_SECRET if TOTP_SECRET_KEY is absent", () => {
    delete process.env.TOTP_SECRET_KEY;
    const rawSecret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
    const encrypted = encryptSecret(rawSecret);
    const decrypted = decryptSecret(encrypted);
    assert.strictEqual(decrypted, rawSecret, "Must decrypt using fallback JWT_SECRET");
    process.env.TOTP_SECRET_KEY = "test-dedicated-totp-secret-key-abcdef";
  });

  test("isValidToken accepts standard 6-digit codes and rejects malformed inputs", () => {
    assert.strictEqual(isValidToken("123456"), true);
    assert.strictEqual(isValidToken("000000"), true);
    assert.strictEqual(isValidToken(" 987654 "), true, "Should trim whitespace");
    assert.strictEqual(isValidToken("12345"), false, "Too short");
    assert.strictEqual(isValidToken("1234567"), false, "Too long");
    assert.strictEqual(isValidToken("abcdef"), false, "Non-digit");
    assert.strictEqual(isValidToken("12 456"), false, "Internal space");
    assert.strictEqual(isValidToken(null), false);
    assert.strictEqual(isValidToken(undefined), false);
  });

  test("verifyTOTP accepts currently generated token (0 drift)", () => {
    const { secret } = generateTOTPSecret("user@pup.local");
    const currentToken = speakeasy.totp({
      secret,
      encoding: "base32",
    });

    const isValid = verifyTOTP(currentToken, secret);
    assert.strictEqual(isValid, true, "Current token must be valid");
  });

  test("verifyTOTP absorbs clock drift within ±60s (window: 2)", () => {
    const { secret } = generateTOTPSecret("user@pup.local");
    const now = Math.floor(Date.now() / 1000);

    // 1 step back (-30 seconds)
    const tokenPast1 = speakeasy.totp({
      secret,
      encoding: "base32",
      time: now - 30,
    });
    assert.strictEqual(verifyTOTP(tokenPast1, secret), true, "-30s drift should be valid with window: 2");

    // 2 steps back (-60 seconds)
    const tokenPast2 = speakeasy.totp({
      secret,
      encoding: "base32",
      time: now - 60,
    });
    assert.strictEqual(verifyTOTP(tokenPast2, secret), true, "-60s drift should be valid with window: 2");

    // 1 step forward (+30 seconds)
    const tokenFuture1 = speakeasy.totp({
      secret,
      encoding: "base32",
      time: now + 30,
    });
    assert.strictEqual(verifyTOTP(tokenFuture1, secret), true, "+30s drift should be valid with window: 2");

    // 2 steps forward (+60 seconds)
    const tokenFuture2 = speakeasy.totp({
      secret,
      encoding: "base32",
      time: now + 60,
    });
    assert.strictEqual(verifyTOTP(tokenFuture2, secret), true, "+60s drift should be valid with window: 2");

    // Extreme drift (> ±90 seconds) should be rejected
    const tokenWayPast = speakeasy.totp({
      secret,
      encoding: "base32",
      time: now - 120,
    });
    assert.strictEqual(verifyTOTP(tokenWayPast, secret), false, "-120s drift should fail with window: 2");

    const tokenWayFuture = speakeasy.totp({
      secret,
      encoding: "base32",
      time: now + 120,
    });
    assert.strictEqual(verifyTOTP(tokenWayFuture, secret), false, "+120s drift should fail with window: 2");
  });

  test("verifyTOTP handles whitespace in submitted tokens", () => {
    const { secret } = generateTOTPSecret("user@pup.local");
    const currentToken = speakeasy.totp({
      secret,
      encoding: "base32",
    });

    assert.strictEqual(verifyTOTP(` ${currentToken} `, secret), true);
  });
});

describe("TOTP Middleware & Edge Cases", () => {
  test("verifyTOTP respects custom TOTP_WINDOW environment override", () => {
    process.env.TOTP_WINDOW = "1";
    const { secret } = generateTOTPSecret("user@pup.local");
    const now = Math.floor(Date.now() / 1000);

    // ±30s should pass
    const tokenPast1 = speakeasy.totp({ secret, encoding: "base32", time: now - 30 });
    assert.strictEqual(verifyTOTP(tokenPast1, secret), true);

    // ±60s should fail when window is 1
    const tokenPast2 = speakeasy.totp({ secret, encoding: "base32", time: now - 60 });
    assert.strictEqual(verifyTOTP(tokenPast2, secret), false);

    // Reset back to 2
    process.env.TOTP_WINDOW = "2";
  });

  test("verifyTOTP respects window option passed directly in options", () => {
    const { secret } = generateTOTPSecret("user@pup.local");
    const now = Math.floor(Date.now() / 1000);

    const tokenPast3 = speakeasy.totp({ secret, encoding: "base32", time: now - 90 });
    assert.strictEqual(verifyTOTP(tokenPast3, secret, { window: 1 }), false);
    assert.strictEqual(verifyTOTP(tokenPast3, secret, { window: 3 }), true);
  });

  test("extractTOTPToken parses tokens from Headers instances and plain objects", () => {
    const headersInstance = new Headers();
    headersInstance.set("x-totp-token", "123456");
    assert.strictEqual(extractTOTPToken(headersInstance), "123456");

    const headersUpper = new Headers();
    headersUpper.set("X-TOTP-Token", "654321");
    assert.strictEqual(extractTOTPToken(headersUpper), "654321");

    assert.strictEqual(extractTOTPToken({ "x-totp-token": "112233" }), "112233");
    assert.strictEqual(extractTOTPToken({ "X-TOTP-Token": "445566" }), "445566");
    assert.strictEqual(extractTOTPToken({}), null);
    assert.strictEqual(extractTOTPToken(null), null);
  });
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isDemoAccount } from "../src/lib/demoAccounts.js";
import { hashPassword, verifyPasswordHash } from "../src/lib/passwordHash.js";

const demoEmails = ["superadmin@pup.local", "admin.registrar@pup.local", "staff.registrar@pup.local", "admin.osas@pup.local", "staff.osas@pup.local", "student@pup.local", "test.student@pup.local"];
const defaultHash = hashPassword("pupstaff");
const changedHash = hashPassword("Changed-password-42!");

async function handler(path, method, bindings) {
  const source = await readFile(new URL(`../src/app/api/auth/${path}/route.js`, import.meta.url), "utf8");
  const code = source.replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*/gm, "").replace(/^export /gm, "");
  return new Function(...Object.keys(bindings), `${code}\nreturn ${method};`)(...Object.values(bindings));
}

function dependencies(staff, staleFlag = false) {
  const issued = [];
  const noop = async () => {};
  return { issued, bindings: {
    NextResponse: { json: (body, init) => Object.assign(Response.json(body, init), { cookies: { set() {} } }) },
    isDemoAccount, verifyPasswordHash,
    getStaffById: async () => staff, getStaffByUsername: async () => staff, touchStaffLastActiveById: async () => staff,
    hasAllSecurityAnswers: async () => false, authDebug() {}, query: async () => [], queryOne: async () => staff,
    getStaffDisplayName: () => "Test Account",
    checkAuthLoginRateLimit: async () => ({ allowed: true }), checkAuth2FARateLimit: async () => ({ allowed: true }),
    resetAuthLoginRateLimit: noop, resetAuth2FARateLimit: noop,
    LoginSchema: { safeParse: (data) => ({ success: true, data }) }, isStaffOfficeActive: async () => true,
    getSessionVersion: async () => 0, signSessionToken: async (payload) => { issued.push(payload); return "test-token"; },
    getSessionCookieName: () => "pup_session", createSession: noop, registerSessionToken: noop, revokeSession: noop,
    writeAuditLog: noop, warmRegistrarIngestQueueOnLogin() {}, shouldUseSecureCookie: () => false,
    attachRefreshSession: async (res) => res,
    verifySessionToken: async () => ({ sub: staff.id, purpose: "2fa", jti: "challenge" }), isSessionActive: async () => true,
    decryptSecret: () => "secret", verifyTOTP: () => true,
    requireAuth: async () => ({ user: { id: staff.id, role: staff.role, email: staff.email, payload: { mustChangePassword: staleFlag } } }),
    getRoleBranding: () => ({ color: "#800000" }), isSystemAdminRole: () => false, parseStaffPreferences: () => ({}),
  } };
}

const account = (email, passwordHash = defaultHash) => ({ id: "test-staff", email, role: "Staff", status: "Active", password_hash: passwordHash, totp_enabled: true });
const request = (data) => new Request("http://localhost:3000/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });

test("demo exemption uses the exact demo sign-in allowlist", () => {
  for (const email of demoEmails) {
    assert.equal(isDemoAccount(email), true);
    assert.equal(isDemoAccount(` ${email.toUpperCase()} `), true);
  }
  for (const email of ["real.staff@pup.local", "admin.default@pup.local", "superadmin@pup.local.example", "", null]) assert.equal(isDemoAccount(email), false);
});

for (const [path, method] of [["login", "POST"], ["login/verify-2fa", "POST"], ["me", "GET"]]) {
  test(`${path} exempts demos while preserving real-account password setup`, async () => {
    for (const email of [...demoEmails.slice(0, 5), "real.staff@pup.local"]) {
      const staff = account(email);
      if (path === "login") staff.totp_enabled = false;
      const { bindings, issued } = dependencies(staff, true);
      const route = await handler(path, method, bindings);
      const response = await route(request({ username: email, password: "pupstaff", tempToken: "challenge", code: "123456" }));
      assert.equal(response.status, 200, email);
      const data = (await response.json()).data;
      const expected = email === "real.staff@pup.local";
      assert.equal(data.mustChangePassword, expected, email);
      if (issued.length) assert.equal(issued.at(-1).mustChangePassword, expected, email);
      if (path === "me") assert.equal(data.mustSetSecurityQuestions, true, "demo exemption preserves recovery-question setup");
    }
  });
}

test("me suppresses stale demo token flags but retains real-account flags", async () => {
  for (const [email, staleFlag, expected] of [["staff.registrar@pup.local", true, false], ["real.staff@pup.local", true, true], ["real.staff@pup.local", false, false]]) {
    const { bindings } = dependencies(account(email, changedHash), staleFlag);
    const route = await handler("me", "GET", bindings);
    const response = await route(new Request("http://localhost:3000/api/auth/me"));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.mustChangePassword, expected);
  }
});

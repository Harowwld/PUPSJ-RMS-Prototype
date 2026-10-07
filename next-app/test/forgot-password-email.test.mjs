import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function loadFunctions(path, bindings, exports) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = source.replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*/gm, "").replace(/^export /gm, "");
  return new Function(...Object.keys(bindings), `${code}\nreturn { ${exports.join(", ")} };`)(...Object.values(bindings));
}

const staff = { id: "recovery-test", status: "Active", email: "registered@example.test", fname: "Test", lname: "Staff" };
const request = (url = "http://localhost:3000/api/auth/forgot-password/identify") => new Request(url, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: "test.staff" }),
});

const recovery = await loadFunctions("../src/lib/passwordRecovery.js", {}, ["getPasswordRecoveryOrigin", "createPasswordResetUrl"]);

async function route({ account = staff, configured = true, deliveryFailure = false, requestUrl } = {}) {
  const queries = [], emails = [], logs = [], audits = [];
  let lookups = 0;
  const query = async (sql, params) => { queries.push({ sql, params }); return []; };
  const { POST } = await loadFunctions("../src/app/api/auth/forgot-password/identify/route.js", {
    ...recovery, crypto, NextResponse: { json: Response.json }, query,
    transaction: async (callback) => callback({ query }),
    ForgotPasswordIdentifySchema: { safeParse: (data) => ({ success: true, data }) },
    checkAuthForgotPasswordRateLimit: async () => ({ allowed: true }),
    getStaffByUsername: async () => { lookups++; return account; },
    assertAccountEmailConfigured: () => { if (!configured) throw new Error("not configured"); },
    sendPasswordResetEmail: async (email) => { emails.push(email); if (deliveryFailure) throw new Error(`provider leaked ${new URL(email.resetUrl).hash.slice("#token=".length)}`); },
    writeGlobalAuditLog: async (...args) => audits.push(args),
    console: { error: (...args) => logs.push(args.join(" ")) },
    setTimeout: (callback) => callback(),
  }, ["POST"]);
  const response = await POST(request(requestUrl));
  return { response, body: await response.json(), queries, emails, logs, audits, lookups };
}

test("recovery sends a private reset link to the registered email and stores only the token hash", async () => {
  const result = await route();
  assert.equal(result.response.status, 200);
  assert.equal(result.emails.length, 1);
  const email = result.emails[0];
  assert.equal(email.to, staff.email);
  assert.equal(email.fullName, "Test Staff");
  assert.match(email.resetUrl, /^http:\/\/localhost:3000\/forgot-password#token=[A-Za-z0-9_-]{43}$/);
  const inserted = result.queries.find(({ sql }) => sql.includes("INSERT INTO password_reset_tokens"));
  assert.equal(inserted.params[1], crypto.createHash("sha256").update(new URL(email.resetUrl).hash.slice("#token=".length)).digest("hex"));
  assert.ok(result.queries[0].sql.includes("FOR UPDATE"));
  assert.ok(result.queries[1].sql.includes("used_at = NOW()"));
  assert.equal(JSON.stringify(result.body).includes(new URL(email.resetUrl).hash.slice("#token=".length)), false);
  assert.equal(JSON.stringify(result.audits).includes(new URL(email.resetUrl).hash.slice("#token=".length)), false);
  assert.deepEqual(result.body, (await route({ account: null })).body);
});

test("delivery failure invalidates exactly the issued token without exposing provider errors", async () => {
  const result = await route({ deliveryFailure: true });
  assert.equal(result.response.status, 200);
  const inserted = result.queries.find(({ sql }) => sql.includes("INSERT INTO"));
  const invalidated = result.queries.at(-1);
  assert.ok(invalidated.sql.includes("WHERE token_hash = $1"));
  assert.deepEqual(invalidated.params, [inserted.params[1]]);
  assert.equal(result.audits.length, 0);
  assert.equal(result.logs.length, 1);
  assert.equal(result.logs[0].includes(new URL(result.emails[0].resetUrl).hash.slice("#token=".length)), false);
  assert.deepEqual(result.body, (await route({ account: null })).body);
});

for (const account of [null, { ...staff, status: "Inactive" }]) {
  test(`recovery does not issue or email a token for ${account ? "inactive" : "unknown"} accounts`, async () => {
    const result = await route({ account });
    assert.equal(result.response.status, 200);
    assert.equal(result.queries.length, 0);
    assert.equal(result.emails.length, 0);
  });
}

test("missing SMTP configuration returns the same actionable error before account lookup", async () => {
  const known = await route({ configured: false });
  const unknown = await route({ configured: false, account: null });
  assert.equal(known.response.status, 503);
  assert.equal(known.lookups, 0);
  assert.equal(known.emails.length, 0);
  assert.deepEqual(known.body, unknown.body);
});

test("reset mail has a clickable button and plaintext link and rejects unaccepted delivery", async () => {
  const savedEnv = { ...process.env };
  Object.assign(process.env, { SMTP_HOST: "smtp.example.test", SMTP_FROM: "no-reply@example.test", SMTP_USER: "", SMTP_PASSWORD: "" });
  try {
    const sent = [];
    let accepted = [staff.email];
    const { sendPasswordResetEmail } = await loadFunctions("../src/lib/accountEmail.js", {
      nodemailer: { createTransport: () => ({ sendMail: async (mail) => { sent.push(mail); return { accepted, messageId: "test" }; } }) },
    }, ["sendPasswordResetEmail"]);
    await sendPasswordResetEmail({ to: staff.email, fullName: "<Staff>", resetUrl: "https://emanage.example.test/forgot-password#token=private-test-token" });
    assert.equal(sent[0].to, staff.email);
    assert.ok(sent[0].text.includes("private-test-token"));
    assert.ok(sent[0].html.includes('href="https://emanage.example.test/forgot-password#token=private-test-token"'));
    assert.ok(sent[0].html.includes(">Reset Password</a>"));
    assert.equal(sent[0].text.includes("Enter this token"), false);
    assert.ok(sent[0].html.includes("&lt;Staff&gt;"));
    assert.ok(sent[0].text.includes("15 minutes"));
    accepted = [];
    await assert.rejects(sendPasswordResetEmail({ to: staff.email, resetUrl: "https://emanage.example.test/forgot-password#token=test" }), /not accepted/);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
    Object.assign(process.env, savedEnv);
  }
});

async function withAppUrl(appUrl, callback) {
  const originalAppUrl = process.env.APP_URL;
  const originalPublicUrl = process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl !== undefined) process.env.APP_URL = appUrl;
  try { await callback(); } finally {
    if (originalAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalAppUrl;
    if (originalPublicUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalPublicUrl;
  }
}

test("an unconfigured nonlocal request origin fails before lookup for known and unknown accounts", async () => {
  await withAppUrl(undefined, async () => {
    const requestUrl = "https://attacker.example.test/api/auth/forgot-password/identify";
    const known = await route({ requestUrl });
    const unknown = await route({ requestUrl, account: null });
    assert.equal(known.response.status, 503);
    assert.equal(known.lookups, 0);
    assert.equal(known.emails.length, 0);
    assert.deepEqual(known.body, unknown.body);
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      assert.equal(recovery.getPasswordRecoveryOrigin(`http://${host}:3456/path`), `http://${host}:3456`);
    }
  });
});

test("configured APP_URL overrides the request origin and strips unrelated URL components", async () => {
  await withAppUrl("https://emanage.example.test/base?ignored=yes#ignored", async () => {
    const result = await route({ requestUrl: "https://attacker.example.test/api/auth/forgot-password/identify" });
    assert.equal(result.response.status, 200);
    assert.match(result.emails[0].resetUrl, /^https:\/\/emanage\.example\.test\/forgot-password#token=/);
  });
});

test("invalid configured recovery URLs are rejected without account lookup", async () => {
  for (const appUrl of ["not a URL", "javascript:alert(1)", "https://user:password@example.test"]) {
    await withAppUrl(appUrl, async () => {
      const result = await route();
      assert.equal(result.response.status, 503);
      assert.equal(result.lookups, 0);
    });
  }
});

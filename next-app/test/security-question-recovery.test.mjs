import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { z } from "zod";

async function loadFunctions(path, bindings, exports) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = source.replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*/gm, "").replace(/^export /gm, "");
  return new Function(...Object.keys(bindings), `${code}\nreturn { ${exports.join(", ")} };`)(...Object.values(bindings));
}
const schemas = await loadFunctions("../src/lib/authSchemas.js", { z }, ["ForgotPasswordIdentifySchema", "ForgotPasswordResetSchema"]);
const hashing = await loadFunctions("../src/lib/passwordHash.js", { crypto }, ["hashPassword", "verifyPasswordHash"]);
const staff = { id: "recovery-test", status: "Active", fname: "Test", lname: "Staff" };
const payload = { id: staff.id, questionId: 2, answer: " Blue ", newPassword: "New-password-123!" };
const request = (body) => new Request("http://localhost:3000/api/auth/forgot-password/reset", {
  method: "POST", headers: { "content-type": "application/json", "x-real-ip": "127.0.0.1" }, body: JSON.stringify(body),
});

async function reset({ body = payload, account = staff, storedAnswer = { answer_hash: hashing.hashPassword("blue") }, allowed = true, databaseError = null, resetRow = { id: 1, staff_id: staff.id }, lockedToken = { id: 1 } } = {}) {
  const writes = [], reads = [], bumps = [], limits = [], audits = [];
  const { POST } = await loadFunctions("../src/app/api/auth/forgot-password/reset/route.js", {
    crypto, NextResponse: { json: Response.json }, ...schemas, ...hashing,
    transaction: async (callback) => callback({
      query: async (sql, params) => writes.push({ sql, params }),
      queryOne: async (sql, params) => {
        reads.push({ sql, params });
        if (databaseError) throw databaseError;
        if (sql.includes("password_reset_tokens")) return sql.includes("FOR UPDATE") ? lockedToken : resetRow;
        if (sql.includes("staff_security_answers")) return storedAnswer;
        return account;
      },
    }),
    checkAuthForgotPasswordRateLimit: async (...args) => { limits.push(args); return { allowed }; },
    resetAuthForgotPasswordRateLimit: async () => {},
    bumpSessionVersion: async (id) => bumps.push(id),
    writeGlobalAuditLog: async (...args) => audits.push(args),
    validatePasswordPolicy: (password) => ({ valid: password.length >= 8, reason: "Too short" }),
    decryptPII: (value) => value,
  }, ["POST"]);
  const response = await POST(request(body));
  return { response, body: await response.json(), writes, reads, bumps, limits, audits };
}

test("schema accepts email and question reset payloads and rejects malformed questions", () => {
  assert.equal(schemas.ForgotPasswordResetSchema.safeParse(payload).success, true);
  assert.equal(schemas.ForgotPasswordResetSchema.safeParse({ resetToken: "email-token", newPassword: payload.newPassword }).success, true);
  for (const body of [{ ...payload, answer: "  " }, { ...payload, questionId: -1 }, { ...payload, questionId: "2" }, { ...payload, newPassword: "short" }]) {
    assert.equal(schemas.ForgotPasswordResetSchema.safeParse(body).success, false);
  }
});

for (const format of ["scrypt", "legacy"]) {
  test(`correct ${format} answer resets password and invalidates email tokens and sessions`, async () => {
    const answer_hash = format === "scrypt" ? hashing.hashPassword("blue") : crypto.createHash("sha256").update("blue").digest("hex");
    const result = await reset({ storedAnswer: { answer_hash } });
    assert.equal(result.response.status, 200);
    assert.equal(hashing.verifyPasswordHash(payload.newPassword, result.writes[0].params[0]).valid, true);
    assert.deepEqual(result.reads[1].params, [staff.id, payload.questionId]);
    assert.match(result.reads[1].sql, /staff_id = \$1 AND question_id = \$2 FOR UPDATE/);
    assert.match(result.writes[1].sql, /used_at = NOW\(\).*staff_id = \$1/);
    assert.deepEqual(result.bumps, [staff.id]);
    assert.equal(result.audits.length, 1);
    assert.deepEqual(result.limits[1], ["127.0.0.1", staff.id]);
    assert.equal(JSON.stringify(result.body).includes(answer_hash), false);
  });
}

for (const scenario of [
  { label: "wrong answer", body: { ...payload, answer: "red" } },
  { label: "unanswered question", storedAnswer: null },
  { label: "inactive account", account: { ...staff, status: "Inactive" } },
  { label: "missing account", account: null },
]) {
  test(`${scenario.label} does not change password or sessions`, async () => {
    const result = await reset(scenario);
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error, "Invalid security question or answer.");
    assert.equal(result.writes.length, 0);
    assert.equal(result.bumps.length, 0);
    assert.equal(result.audits.length, 0);
  });
}

test("rate limits prevent verification and unrelated database failures propagate", async () => {
  const result = await reset({ allowed: false });
  assert.equal(result.response.status, 429);
  assert.equal(result.reads.length, 0);
  await assert.rejects(reset({ databaseError: new Error("database unavailable") }), /database unavailable/);
});

test("email reset locks staff before its token and rechecks expiry and usage", async () => {
  const body = { resetToken: "private-token", newPassword: payload.newPassword };
  const result = await reset({ body });
  assert.equal(result.response.status, 200);
  assert.match(result.reads[0].sql, /used_at IS NULL AND expires_at > NOW\(\)/);
  assert.doesNotMatch(result.reads[0].sql, /FOR UPDATE/);
  assert.match(result.reads[1].sql, /FROM staff.*FOR UPDATE/);
  assert.match(result.reads[2].sql, /used_at IS NULL AND expires_at > NOW\(\).*\s+FOR UPDATE/);
  assert.deepEqual(result.writes[1].params, [1]);
  assert.deepEqual(result.bumps, [staff.id]);
  for (const scenario of [{ resetRow: null }, { lockedToken: null }]) {
    const expired = await reset({ body, ...scenario });
    assert.equal(expired.response.status, 400);
    assert.equal(expired.writes.length, 0);
  }
});

async function identify({ account = staff, questions = [{ id: 2, question: "Favourite colour?", answer_hash: "must-not-leak" }], allowed = true } = {}) {
  const limits = [], lookups = [];
  const { POST } = await loadFunctions("../src/app/api/auth/forgot-password/security-questions/route.js", {
    NextResponse: { json: Response.json }, ...schemas,
    getStaffByUsername: async () => account,
    getStaffRecoveryQuestions: async (id) => { lookups.push(id); return questions; },
    checkAuthForgotPasswordRateLimit: async (...args) => { limits.push(args); return { allowed }; },
  }, ["POST"]);
  const response = await POST(request({ identifier: "test@example.test" }));
  return { response, body: await response.json(), limits, lookups };
}

test("lookup exposes only answered question text and canonical Staff ID without SMTP", async () => {
  const result = await identify();
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body.data, { id: staff.id, questions: [{ id: 2, question: "Favourite colour?" }] });
  assert.deepEqual(result.limits[1], ["127.0.0.1", staff.id]);
  assert.equal(result.response.headers.get("cache-control"), "no-store");
});

test("question repository joins the account's saved answers and returns only public question columns", async () => {
  const calls = [];
  const { getStaffRecoveryQuestions } = await loadFunctions("../src/lib/staffRepo.js", {
    query: async (sql, params) => { calls.push({ sql, params }); return [{ id: 2, question: "Favourite colour?" }]; },
  }, ["getStaffRecoveryQuestions"]);
  assert.deepEqual(await getStaffRecoveryQuestions(staff.id), [{ id: 2, question: "Favourite colour?" }]);
  assert.match(calls[0].sql, /SELECT q.id, q.question/);
  assert.match(calls[0].sql, /JOIN staff_security_answers a ON a.question_id = q.id/);
  assert.match(calls[0].sql, /a.staff_id = \$1 AND s.status = 'Active'/);
  assert.doesNotMatch(calls[0].sql, /answer_hash/);
  assert.deepEqual(calls[0].params, [staff.id]);
});

test("missing, inactive and unconfigured question accounts share a safe error", async () => {
  const missing = await identify({ account: null });
  const inactive = await identify({ account: { ...staff, status: "Inactive" } });
  const noQuestions = await identify({ questions: [] });
  assert.equal(missing.response.status, 400);
  assert.deepEqual(inactive.body, missing.body);
  assert.deepEqual(noQuestions.body, missing.body);
  assert.equal(inactive.lookups.length, 0);
  assert.equal((await identify({ allowed: false })).response.status, 429);
});

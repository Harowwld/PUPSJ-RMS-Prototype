import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { query, queryOne, pool } from "../src/lib/postgres.js";
import { signSessionToken, verifySessionToken, getSessionCookieName, getRefreshCookieName } from "../src/lib/jwt.js";
import { registerSessionToken, isSessionActive, revokeSession, bumpSessionVersion } from "../src/lib/authSessions.js";
import { issueRefreshToken, rotateRefreshToken, hashRefreshToken } from "../src/lib/refreshSessionsRepo.js";
import { attachRefreshSession, getLogoutPayload, isRefreshRequestAllowed, setRefreshCookies } from "../src/lib/refreshSessions.js";
import { generateCSRFToken, validateCSRFToken } from "../src/lib/csrfProtection.js";
import { resolveMiddlewareSession } from "../src/lib/middlewarePolicy.js";

assert.match(new URL(process.env.DATABASE_URL || "postgres://localhost/missing").pathname,
  /^\/pupsj_rms_refresh_test(?:_|$)/,
  "Session refresh fixtures require an isolated pupsj_rms_refresh_test database");

function request(cookies = {}, origin = "http://127.0.0.1:3107", refreshHeader = "1") {
  return { url: "http://127.0.0.1:3107/api/auth/refresh", method: "POST",
    headers: new Headers({ origin, "x-session-refresh": refreshHeader }),
    cookies: { get: (name) => cookies[name] ? { value: cookies[name] } : undefined } };
}

function response() {
  const cookies = new Map();
  return { headers: new Headers(), cookies: { set: (cookie) => cookies.set(cookie.name, cookie), get: (name) => cookies.get(name) } };
}

test("refresh session rotation and account security (requires migrated test PostgreSQL)", async (t) => {
  const staffIds = [], sessionIds = [], studentIds = [], identityIds = [], studentNos = [], officeIds = [];
  t.after(async () => {
    await query("DELETE FROM auth_sessions WHERE jti = ANY($1::text[])", [sessionIds]);
    await query("DELETE FROM auth_session_revocations WHERE jti = ANY($1::text[])", [sessionIds]);
    await query("DELETE FROM auth_session_versions WHERE principal_id = ANY($1::text[])", [[...staffIds, ...studentIds.map(String)]]);
    await query("DELETE FROM student_accounts WHERE id = ANY($1::bigint[])", [studentIds]);
    await query("DELETE FROM students WHERE student_no = ANY($1::text[])", [studentNos]);
    await query("DELETE FROM student_identity_profiles WHERE id = ANY($1::bigint[])", [identityIds]);
    await query("DELETE FROM staff WHERE id = ANY($1::text[])", [staffIds]);
    await query("DELETE FROM offices WHERE id = ANY($1::text[])", [officeIds]);
    await pool.end();
  });
  async function family({ authLevel = "password", purpose = "access", role = "SuperAdmin", officeId = null } = {}) {
    const id = `refresh-test-${randomUUID()}`;
    staffIds.push(id);
    await query("INSERT INTO staff(id,fname,lname,role,section,email) VALUES ($1,'Refresh','Test','SuperAdmin','test',$2)", [id, `${id}@example.test`]);
    await query("UPDATE staff SET role=$2, office_id=$3 WHERE id=$1", [id, role, officeId]);
    const accessToken = await signSessionToken({ sub: id, role, office_id: officeId, session_version: 0, purpose, mustChangePassword: true });
    const session = await registerSessionToken(accessToken, { principalId: id, role, authLevel });
    sessionIds.push(session.jti);
    return { id, accessToken, payload: await verifySessionToken(accessToken), session,
      ...(purpose === "access" ? { refresh: await issueRefreshToken(accessToken) } : {}) };
  }

  await t.test("15-minute access, hashed refresh storage, fixed 7-day expiry, stable session and CSRF", async () => {
    const original = await family({ authLevel: "2fa" });
    assert.equal(original.payload.exp - original.payload.iat, 15 * 60);
    const oldCsrf = generateCSRFToken(original.session.jti);
    const stored = await queryOne("SELECT * FROM auth_refresh_tokens WHERE token_hash=$1", [hashRefreshToken(original.refresh.token)]);
    assert.ok(stored);
    assert.equal(stored.token_hash.length, 64);
    assert.ok(!Object.values(stored).includes(original.refresh.token));
    const session = await queryOne("SELECT expires_at FROM auth_sessions WHERE jti=$1", [original.session.jti]);
    assert.equal(Math.floor(new Date(session.expires_at).getTime() / 1000), original.refresh.expiresAt);
    assert.ok(original.refresh.expiresAt - original.payload.iat <= 7 * 24 * 60 * 60 + 1);
    const result = await rotateRefreshToken(original.refresh.token);
    assert.equal(result.status, 200);
    assert.notEqual(result.refreshToken, original.refresh.token);
    assert.equal(result.refreshExpiresAt, original.refresh.expiresAt);
    const renewed = await verifySessionToken(result.accessToken);
    assert.equal(renewed.jti, original.session.jti);
    assert.equal(renewed.auth_level, "2fa");
    assert.equal(renewed.mustChangePassword, true);
    assert.equal(validateCSRFToken(oldCsrf, renewed.jti), true);
    const res = setRefreshCookies(response(), result.accessToken, result.refreshToken, result.refreshExpiresAt, request());
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.equal(res.cookies.get(getRefreshCookieName()).httpOnly, true);
    assert.equal(res.cookies.get(getRefreshCookieName()).path, "/");
    assert.equal(res.cookies.get(getRefreshCookieName()).secure, false);
    assert.equal(validateCSRFToken(res.cookies.get("pup_csrf").value, renewed.jti), true);
    assert.notEqual(res.cookies.get("pup_csrf").value, oldCsrf);
  });

  await t.test("concurrent duplicate is 409; later replay commits family revocation", async () => {
    const original = await family();
    const results = await Promise.all([rotateRefreshToken(original.refresh.token), rotateRefreshToken(original.refresh.token)]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    const duplicate = results.find((r) => r.status === 409);
    assert.equal(duplicate.accessToken, undefined);
    const success = results.find((r) => r.status === 200);
    await query("UPDATE auth_refresh_tokens SET consumed_at=NOW()-INTERVAL '11 seconds' WHERE token_hash=$1", [hashRefreshToken(original.refresh.token)]);
    assert.equal((await rotateRefreshToken(original.refresh.token)).status, 401);
    assert.equal((await rotateRefreshToken(success.refreshToken)).status, 401);
    assert.equal(await isSessionActive(await verifySessionToken(success.accessToken)), false);
    assert.ok((await queryOne("SELECT revoked_at FROM auth_sessions WHERE jti=$1", [original.session.jti])).revoked_at);
  });

  await t.test("expired access recovers through refresh; logout still revokes it", async () => {
    const original = await family();
    const expired = await signSessionToken(original.payload, { expiresAt: Math.floor(Date.now() / 1000) - 1 });
    await assert.rejects(verifySessionToken(expired));
    const req = request({ [getSessionCookieName()]: expired, [getRefreshCookieName()]: original.refresh.token });
    const payload = await getLogoutPayload(req);
    assert.equal(payload.jti, original.session.jti);
    assert.equal((await rotateRefreshToken(original.refresh.token)).status, 200);
    await revokeSession(payload.jti, { principalId: payload.sub, reason: "logout" });
    assert.equal((await rotateRefreshToken(original.refresh.token)).status, 401);
  });

  await t.test("account, role, office, version, and family-expiry changes prevent renewal", async () => {
    for (const mutation of ["status", "role", "version", "expiry"]) {
      const original = await family();
      if (mutation === "status") await query("UPDATE staff SET status='Inactive' WHERE id=$1", [original.id]);
      if (mutation === "role") await query("UPDATE staff SET role='Staff' WHERE id=$1", [original.id]);
      if (mutation === "version") await bumpSessionVersion(original.id);
      if (mutation === "expiry") await query("UPDATE auth_sessions SET expires_at=NOW()-INTERVAL '1 second' WHERE jti=$1", [original.session.jti]);
      assert.equal((await rotateRefreshToken(original.refresh.token)).status, 401, mutation);
    }
    const officeId = `refresh-${randomUUID()}`;
    officeIds.push(officeId);
    await query("INSERT INTO offices(id,name,short_name) VALUES ($1,'Refresh Test','TEST')", [officeId]);
    const officeFamily = await family({ role: "Staff", officeId });
    const officeRenewal = await rotateRefreshToken(officeFamily.refresh.token);
    assert.equal(officeRenewal.status, 200);
    await query("UPDATE offices SET status='Inactive' WHERE id=$1", [officeId]);
    assert.equal((await rotateRefreshToken(officeRenewal.refreshToken)).status, 401);
    const original = await family();
    const expiredRefresh = await signSessionToken(await verifySessionToken(original.refresh.token), { expiresAt: Math.floor(Date.now()/1000)-1 });
    assert.equal((await rotateRefreshToken(expiredRefresh)).status, 401);
  });

  await t.test("partial 2FA cannot issue or act as access; full 2FA preserves auth level", async () => {
    const challenge = await family({ authLevel: "2fa-challenge", purpose: "2fa" });
    assert.equal(await isSessionActive(challenge.payload), false);
    assert.equal(await isSessionActive(challenge.payload, { purpose: "2fa" }), true);
    await assert.rejects(issueRefreshToken(challenge.accessToken), /full access session/);
    assert.equal(await resolveMiddlewareSession(challenge.accessToken, null), null);
    const original = await family();
    assert.equal(await resolveMiddlewareSession(original.refresh.token, null), null);
    assert.equal(await resolveMiddlewareSession(null, original.refresh.token), null);
    assert.equal((await resolveMiddlewareSession(null, original.refresh.token, { allowRefresh: true })).purpose, "refresh");
  });

  await t.test("student status and linked student status prevent renewal", async () => {
    const email = `refresh-${randomUUID()}@example.test`;
    const profile = await queryOne("INSERT INTO student_identity_profiles(email,display_name) VALUES ($1,'Refresh Student') RETURNING id", [email]);
    identityIds.push(profile.id);
    const studentNo = `REFRESH-${randomUUID()}`;
    studentNos.push(studentNo);
    await query("INSERT INTO students(student_no,name,identity_profile_id) VALUES ($1,'Refresh Student',$2)", [studentNo, profile.id]);
    const account = await queryOne("INSERT INTO student_accounts(identity_profile_id,password_hash,student_no) VALUES ($1,'test-unused',$2) RETURNING id", [profile.id, studentNo]);
    studentIds.push(account.id);
    const token = await signSessionToken({ sub: String(account.id), role: "Student", principal_type: "student", account_id: account.id, session_version: 0 });
    const session = await registerSessionToken(token, { principalId: String(account.id), principalType: "student", role: "Student" });
    sessionIds.push(session.jti);
    const initial = await issueRefreshToken(token);
    const rotated = await rotateRefreshToken(initial.token);
    assert.equal(rotated.status, 200);
    assert.equal((await verifySessionToken(rotated.accessToken)).student_no, studentNo);
    await query("UPDATE students SET status='Inactive' WHERE student_no=$1", [studentNo]);
    assert.equal((await rotateRefreshToken(rotated.refreshToken)).status, 401);
    await query("UPDATE students SET status='Active' WHERE student_no=$1", [studentNo]);
    const replacementToken = await signSessionToken({ sub: String(account.id), role: "Student", session_version: 0 });
    const replacement = await registerSessionToken(replacementToken, { principalId: String(account.id), principalType: "student", role: "Student" });
    sessionIds.push(replacement.jti);
    const replacementRefresh = await issueRefreshToken(replacementToken);
    await query("UPDATE student_accounts SET status='Inactive' WHERE id=$1", [account.id]);
    assert.equal((await rotateRefreshToken(replacementRefresh.token)).status, 401);
  });

  await t.test("refresh requires custom header and rejects cross-origin and opaque origins", () => {
    assert.equal(isRefreshRequestAllowed(request()), true);
    assert.equal(isRefreshRequestAllowed(request({}, "http://127.0.0.1:3107", "")), false);
    assert.equal(isRefreshRequestAllowed(request({}, "https://attacker.example")), false);
    assert.equal(isRefreshRequestAllowed(request({}, "null")), false);
  });

  await t.test("attachment refuses a second family upgrade and challenges", async () => {
    const original = await family();
    await assert.rejects(attachRefreshSession(response(), original.accessToken, request()), /already been issued/);
  });
});

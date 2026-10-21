import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const { signSessionToken, verifySessionToken } = await import("../src/lib/jwt.js");
const { getStaffById } = await import("../src/lib/staffRepo.js");
const { registerSessionToken } = await import("../src/lib/authSessions.js");
const { generateCSRFToken } = await import("../src/lib/csrfProtection.js");
const { pool } = await import("../src/lib/postgres.js");

test("POST /api/system/backup/schedule accepts toggle update with lastRunAt and telemetry fields", async (t) => {
  t.after(async () => {
    await pool.end();
  });

  const superAdmin = await getStaffById("PUPSUPERADMIN-001");
  assert.ok(superAdmin, "SuperAdmin account must exist");

  const token = await signSessionToken({
    sub: superAdmin.id,
    role: superAdmin.role,
    office_id: null,
    username: superAdmin.email,
  });
  const payload = await verifySessionToken(token);
  await registerSessionToken(token, {
    principalId: superAdmin.id,
    role: superAdmin.role,
    username: superAdmin.email,
  });
  const csrf = generateCSRFToken(payload.jti);

  const headers = {
    "Content-Type": "application/json",
    Origin: "http://localhost:3000",
    Cookie: `pup_session=${token}; pup_csrf=${csrf}`,
    "x-csrf-token": csrf,
  };

  // 1. GET existing schedule
  const getRes = await fetch(`${BASE_URL}/api/system/backup/schedule`, {
    headers: {
      Cookie: `pup_session=${token}`,
    },
  });
  assert.equal(getRes.status, 200);
  const getJson = await getRes.json();
  assert.equal(getJson.ok, true);
  assert.ok(getJson.data);

  // 2. Simulate user toggling auto backup with full state object (containing lastRunAt, etc.)
  const togglePayload = {
    ...getJson.data,
    enabled: true,
  };

  const postRes = await fetch(`${BASE_URL}/api/system/backup/schedule`, {
    method: "POST",
    headers,
    body: JSON.stringify(togglePayload),
  });

  const postJson = await postRes.json();
  assert.equal(postRes.status, 200, `Expected 200 OK but got ${postRes.status}: ${JSON.stringify(postJson)}`);
  assert.equal(postJson.ok, true);
  assert.equal(postJson.data.enabled, true);

  // 3. Test that truly unsupported fields are still rejected
  const invalidPayload = {
    ...togglePayload,
    completelyUnknownField123: "illegal",
  };

  const invalidRes = await fetch(`${BASE_URL}/api/system/backup/schedule`, {
    method: "POST",
    headers,
    body: JSON.stringify(invalidPayload),
  });
  const invalidJson = await invalidRes.json();
  assert.equal(invalidRes.status, 400);
  assert.equal(invalidJson.ok, false);
  assert.match(invalidJson.error, /Unsupported field: completelyUnknownField123/);
});

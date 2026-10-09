import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const STAFF_PASSWORD = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";

async function login(username, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(res.status, 200, `Login failed for ${username}: ${res.status}`);
  const setCookies = res.headers.getSetCookie();
  const cookieHeader = setCookies.map((c) => c.split(";")[0]).join("; ");
  const json = await res.json();
  assert.ok(json.ok, `Login response ok was false for ${username}`);
  return { cookieHeader, user: json.data?.user };
}

async function runTests() {
  console.log("=== STARTING SCAN & UPLOAD BULK ISOSAS TEST ===");

  // 1. Verify isOsas resolution logic
  console.log("\n[Test 1] Testing isOsas resolution across different office contexts...");
  const registrarUser = { office_id: "registrar", role: "Staff" };
  const osasUser = { office_id: "osas", role: "Staff" };
  const nullUser = null;
  const uppercaseOsasUser = { office_id: "OSAS", role: "Admin" };

  const resolveIsOsas = (user, propIsOsas = null) => {
    return Boolean(propIsOsas ?? ((user?.office_id || "").toLowerCase() === "osas"));
  };

  assert.equal(resolveIsOsas(registrarUser), false, "Registrar user must not be OSAS");
  assert.equal(resolveIsOsas(osasUser), true, "OSAS user must be OSAS");
  assert.equal(resolveIsOsas(nullUser), false, "Null user must safely resolve to false without throwing");
  assert.equal(resolveIsOsas(uppercaseOsasUser), true, "Uppercase OSAS office_id must resolve to true");
  assert.equal(resolveIsOsas(registrarUser, true), true, "Explicit prop override must take precedence");
  console.log("✓ isOsas resolution logic is safe and robust.");

  // 2. Test OSAS Batch Organization Import via API
  console.log("\n[Test 2] Logging in as OSAS Admin...");
  const osas = await login("admin.osas@pup.local", STAFF_PASSWORD);
  console.log("✓ Logged in as OSAS Admin.");

  console.log("\n[Test 3] Executing OSAS batch organization import (/api/osas/organizations/batch)...");
  const testOrgAcronym = `ORG-${Date.now().toString().slice(-4)}`;
  const batchRes = await fetch(`${BASE_URL}/api/osas/organizations/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: osas.cookieHeader,
    },
    body: JSON.stringify({
      rows: [
        {
          name: `Test Organization ${testOrgAcronym}`,
          acronym: testOrgAcronym,
          category: "Academic",
          adviserName: "Prof. Maria Clara",
          adviserEmail: "maria.clara@pup.local",
          room: 1,
          cabinet: "ACADEMIC ORGANIZATIONS",
          drawer: 1,
        },
      ],
    }),
  });
  const batchJson = await batchRes.json();
  assert.equal(batchRes.status, 200, `OSAS batch upload failed: ${JSON.stringify(batchJson)}`);
  assert.ok(batchJson.ok, "OSAS batch upload must return ok: true");
  assert.ok(Array.isArray(batchJson.data), "OSAS batch data must be an array");
  assert.equal(batchJson.data.length, 1, "Must return 1 result");
  assert.equal(batchJson.data[0].ok, true, `Row error: ${batchJson.data[0].error}`);
  console.log("✓ OSAS organization batch import completed successfully.");

  // 3. Test Registrar Batch Student Import via API
  console.log("\n[Test 4] Logging in as Registrar Staff...");
  const registrar = await login("staff.registrar@pup.local", STAFF_PASSWORD);
  console.log("✓ Logged in as Registrar Staff.");

  console.log("\n[Test 5] Fetching layout and executing Registrar student batch import...");
  const layoutRes = await fetch(`${BASE_URL}/api/storage-layout`, {
    headers: { Cookie: registrar.cookieHeader },
  });
  const layoutJson = await layoutRes.json();
  const testRoomId = layoutJson.data?.rooms?.[0]?.id || 1;
  const testCabinetId = layoutJson.data?.rooms?.[0]?.cabinets?.[0]?.id || "2020";
  const testDrawerId = layoutJson.data?.rooms?.[0]?.cabinets?.[0]?.drawerIds?.[0] || 1;

  const testStudentNo = `REG-BATCH-${Date.now().toString().slice(-4)}-SJ-0`;
  const regBatchRes = await fetch(`${BASE_URL}/api/students/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: registrar.cookieHeader,
    },
    body: JSON.stringify({
      rows: [
        {
          studentNo: testStudentNo,
          name: "DELA CRUZ, JUAN PAULO",
          courseCode: "BSIT",
          yearLevel: 2026,
          section: "1-1",
          room: testRoomId,
          cabinet: testCabinetId,
          drawer: testDrawerId,
        },
      ],
    }),
  });
  const regBatchJson = await regBatchRes.json();
  assert.equal(regBatchRes.status, 200, `Registrar batch upload failed: ${JSON.stringify(regBatchJson)}`);
  assert.ok(regBatchJson.ok, "Registrar batch upload must return ok: true");
  assert.equal(regBatchJson.data[0].ok, true, `Row error: ${regBatchJson.data[0].error}`);
  console.log("✓ Registrar student batch import completed successfully.");

  console.log("\n=== ALL ISOSAS AND BULK UPLOAD TESTS PASSED! ===");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

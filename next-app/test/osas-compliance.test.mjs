import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

function extractCookies(res) {
  const setCookies = res.headers.getSetCookie();
  const cookies = {};
  for (const sc of setCookies) {
    const [pair] = sc.split(";");
    const [k, v] = pair.split("=");
    if (k && v) cookies[k.trim()] = v.trim();
  }
  return {
    cookieHeader: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; "),
    csrfToken: cookies["pup_csrf"] || "",
  };
}

async function runComplianceTests() {
  console.log("=== STARTING OSAS VS REGISTRAR COMPLIANCE SUITE ===");

  // 1. Authenticate as OSAS Admin
  console.log("\n[Test 1] Authenticating as OSAS Admin (admin.osas@pup.local)...");
  const loginOsasRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin.osas@pup.local", password: "pupstaff" }),
  });
  assert.equal(loginOsasRes.status, 200, "OSAS Admin login status should be 200");
  const loginOsasJson = await loginOsasRes.json();
  assert.equal(loginOsasJson.ok, true, "OSAS login should succeed");
  assert.equal(loginOsasJson.data.office_id, "osas", "Office should be 'osas'");
  const osasAuth = extractCookies(loginOsasRes);
  assert.ok(osasAuth.cookieHeader, "Session cookie required");
  console.log("✓ Authenticated as OSAS Admin.");

  // 2. Query compliance endpoint as OSAS Admin
  console.log("\n[Test 2] Querying /api/analytics/digitization-compliance as OSAS Admin...");
  const osasCompRes = await fetch(`${BASE_URL}/api/analytics/digitization-compliance`, {
    headers: { cookie: osasAuth.cookieHeader },
  });
  assert.equal(osasCompRes.status, 200, "Compliance status should be 200");
  const osasCompJson = await osasCompRes.json();
  assert.equal(osasCompJson.ok, true, "Compliance response ok should be true");

  const osasData = osasCompJson.data;
  assert.equal(osasData.type, "organization", "Data type should be 'organization'");
  assert.equal(osasData.officeId, "osas", "Office ID should be 'osas'");
  assert.ok(osasData.summary, "Summary object must exist");
  assert.ok(osasData.summary.totalOrganizations >= 5, "Should have at least 5 recognized organizations");
  assert.ok(osasData.summary.overallComplianceRate >= 0, "Compliance rate should be valid");
  assert.ok(osasData.summary.cblArchivedCount >= 1, "Should have at least 1 archived CBL");
  assert.ok(osasData.summary.withOfficersCount >= 1, "Should have at least 1 org with whitelisted officers");
  console.log(`✓ OSAS compliance returns ${osasData.summary.totalOrganizations} organizations, ${osasData.summary.overallComplianceRate}% overall compliance rate.`);

  // 3. Verify category breakdown
  console.log("\n[Test 3] Verifying OSAS category breakdown (Academic vs Non-Academic)...");
  assert.ok(Array.isArray(osasData.byCategory), "byCategory should be an array");
  const categories = osasData.byCategory.map((c) => c.category);
  assert.ok(categories.includes("Academic"), "Should include Academic category");
  assert.ok(categories.includes("Non-Academic"), "Should include Non-Academic category");
  console.log(`✓ Categories found: ${categories.join(", ")}`);

  // 4. Verify organization checklist and requirements
  console.log("\n[Test 4] Verifying organization checklist and compliance evaluation...");
  assert.ok(Array.isArray(osasData.organizations), "organizations should be an array");
  const hhco = osasData.organizations.find((o) => o.id === "helping-hands");
  assert.ok(hhco, "Helping Hands organization must be present");
  assert.equal(hhco.hasCbl, true, "Helping Hands should have archived CBL");
  assert.ok(hhco.activeOfficerCount >= 2, "Helping Hands should have at least 2 active officers");
  assert.equal(hhco.complianceScore, 100, "Helping Hands should have 100% compliance score");
  assert.equal(hhco.complianceStatus, "Compliant", "Helping Hands should be marked Compliant");
  assert.deepEqual(hhco.missingRequirements, [], "Helping Hands should have no missing requirements");

  const jpcs = osasData.organizations.find((o) => o.id === "jpcs");
  assert.ok(jpcs, "JPCS organization must be present");
  assert.equal(jpcs.category, "Academic", "JPCS should be Academic");
  assert.ok(jpcs.checklist, "JPCS must have checklist object");
  console.log("✓ Organization compliance checklist and score verified.");

  // 5. Test filtering by category
  console.log("\n[Test 5] Testing category filter (?category=Academic)...");
  const acadRes = await fetch(`${BASE_URL}/api/analytics/digitization-compliance?category=Academic`, {
    headers: { cookie: osasAuth.cookieHeader },
  });
  const acadJson = await acadRes.json();
  assert.equal(acadJson.ok, true);
  assert.ok(acadJson.data.organizations.every((o) => o.category === "Academic"), "All returned orgs should be Academic");
  console.log(`✓ Category filter verified: ${acadJson.data.organizations.length} Academic org(s).`);

  // 6. Test search filter
  console.log("\n[Test 6] Testing search filter (?search=Hands)...");
  const searchRes = await fetch(`${BASE_URL}/api/analytics/digitization-compliance?search=Hands`, {
    headers: { cookie: osasAuth.cookieHeader },
  });
  const searchJson = await searchRes.json();
  assert.equal(searchJson.ok, true);
  assert.ok(searchJson.data.organizations.some((o) => o.id === "helping-hands"), "Should find Helping Hands");
  console.log("✓ Search filter verified.");

  // 7. Test Registrar Admin returns student-course compliance (no regression!)
  console.log("\n[Test 7] Authenticating as Registrar Admin (admin.registrar@pup.local)...");
  const loginRegRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin.registrar@pup.local", password: "pupstaff" }),
  });
  assert.equal(loginRegRes.status, 200, "Registrar login should succeed");
  const regAuth = extractCookies(loginRegRes);

  console.log("\n[Test 8] Verifying Registrar returns student academic compliance...");
  const regCompRes = await fetch(`${BASE_URL}/api/analytics/digitization-compliance`, {
    headers: { cookie: regAuth.cookieHeader },
  });
  assert.equal(regCompRes.status, 200);
  const regCompJson = await regCompRes.json();
  assert.equal(regCompJson.ok, true);
  assert.notEqual(regCompJson.data.type, "organization", "Registrar should not return organization type");
  assert.ok(regCompJson.data.summary.totalStudents > 0, "Registrar should have students");
  assert.ok(Array.isArray(regCompJson.data.byCourse), "Registrar should have byCourse breakdown");
  console.log(`✓ Registrar student compliance preserved: ${regCompJson.data.summary.totalStudents} students across ${regCompJson.data.byCourse.length} courses.`);

  console.log("\n=== ALL OSAS & REGISTRAR COMPLIANCE TESTS PASSED ===");
}

runComplianceTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});

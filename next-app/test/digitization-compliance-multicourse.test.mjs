import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import assert from "node:assert/strict";

const { getDigitizationComplianceSummary } = await import("../src/lib/digitizationComplianceRepo.js");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const STAFF_PASSWORD = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";

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

async function runTests() {
  console.log("=== STARTING DIGITIZATION COMPLIANCE MULTI-COURSE TEST ===");

  // 1. Direct Repo Call - Single course
  console.log("\n[Test 1] Querying repo with single course (BSIT)...");
  const singleRes = await getDigitizationComplianceSummary({
    studentStatus: "Active",
    courseCodes: ["BSIT"],
    officeId: "registrar",
  });
  assert.ok(singleRes.summary, "Summary should exist");
  assert.equal(singleRes.byCourse.length, 1, "Should only have 1 course row for BSIT");
  assert.equal(singleRes.byCourse[0].courseCode, "BSIT");
  assert.equal(singleRes.meta.courseCode, "BSIT");
  assert.deepEqual(singleRes.meta.courseCodes, ["BSIT"]);
  console.log(`✓ Single course (BSIT): ${singleRes.summary.totalStudents} students`);

  // 2. Direct Repo Call - Another single course (BSENT)
  console.log("\n[Test 2] Querying repo with another course (BSENT)...");
  const bsentRes = await getDigitizationComplianceSummary({
    studentStatus: "Active",
    courseCodes: ["BSENT"],
    officeId: "registrar",
  });
  assert.ok(bsentRes.summary, "Summary should exist");
  assert.equal(bsentRes.byCourse.length, 1, "Should only have 1 course row for BSENT");
  assert.equal(bsentRes.byCourse[0].courseCode, "BSENT");
  console.log(`✓ Single course (BSENT): ${bsentRes.summary.totalStudents} students`);

  // 3. Direct Repo Call - Combined multiple courses (['BSIT', 'BSENT'])
  console.log("\n[Test 3] Querying repo with multiple courses (['BSIT', 'BSENT'])...");
  const multiRes = await getDigitizationComplianceSummary({
    studentStatus: "Active",
    courseCodes: ["BSIT", "BSENT"],
    officeId: "registrar",
  });
  assert.ok(multiRes.summary, "Summary should exist");
  assert.equal(multiRes.byCourse.length, 2, "Should have exactly 2 course rows for BSIT and BSENT");
  const coursesReturned = multiRes.byCourse.map((c) => c.courseCode).sort();
  assert.deepEqual(coursesReturned, ["BSENT", "BSIT"]);
  assert.equal(
    multiRes.summary.totalStudents,
    singleRes.summary.totalStudents + bsentRes.summary.totalStudents,
    "Combined student total should equal sum of BSIT + BSENT students"
  );
  assert.deepEqual(multiRes.meta.courseCodes, ["BSIT", "BSENT"]);
  assert.equal(multiRes.meta.courseCode, "BSIT, BSENT");
  console.log(`✓ Combined multi-course returned ${multiRes.summary.totalStudents} total students across BSENT and BSIT`);

  // 4. Comma-separated courseCode string input
  console.log("\n[Test 4] Querying repo with comma-separated courseCode string 'BSIT, BSENT'...");
  const commaRes = await getDigitizationComplianceSummary({
    studentStatus: "Active",
    courseCode: "BSIT, BSENT",
    officeId: "registrar",
  });
  assert.equal(commaRes.byCourse.length, 2);
  assert.equal(commaRes.summary.totalStudents, multiRes.summary.totalStudents);
  console.log("✓ Comma-separated string parsed and filtered identically.");

  // 5. Test API route with authenticated Registrar Admin
  console.log("\n[Test 5] Authenticating as Registrar Admin (admin.registrar@pup.local)...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin.registrar@pup.local", password: STAFF_PASSWORD }),
  });
  assert.equal(loginRes.status, 200);
  const regAuth = extractCookies(loginRes);

  console.log("\n[Test 6] Fetching API route with ?courseCode=BSIT,BSENT...");
  const apiRes = await fetch(`${BASE_URL}/api/analytics/digitization-compliance?status=Active&courseCode=BSIT,BSENT`, {
    headers: { cookie: regAuth.cookieHeader },
  });
  assert.equal(apiRes.status, 200);
  const apiJson = await apiRes.json();
  assert.equal(apiJson.ok, true);
  assert.equal(apiJson.data.byCourse.length, 2);
  assert.equal(apiJson.data.meta.courseCode, "BSIT, BSENT");
  assert.deepEqual(apiJson.data.meta.courseCodes, ["BSIT", "BSENT"]);
  console.log("✓ API returned dynamic multi-course combined data.");

  console.log("\n=== ALL MULTI-COURSE COMPLIANCE TESTS PASSED ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

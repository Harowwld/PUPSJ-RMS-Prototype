import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import assert from "node:assert/strict";

const { getDigitizationComplianceSummary } = await import("../src/lib/digitizationComplianceRepo.js");
const { listDocTypes, listAllDocTypes } = await import("../src/lib/docTypesRepo.js");

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

async function runTests() {
  console.log("=== STARTING DOCUMENT TYPES PARTITIONING TEST ===");

  // 1. Direct Repo Call - listDocTypes scope filtering
  console.log("\n[Test 1] Testing listDocTypes scope filtering directly from repo...");
  const requestableDocs = await listDocTypes({ officeId: "registrar", scope: "requestable" });
  console.log("Requestable Registrar docs:", requestableDocs);
  assert.ok(requestableDocs.includes("Certificate of Enrollment"), "Should include Certificate of Enrollment");
  assert.ok(requestableDocs.includes("Certified True Copy of Records"), "Should include Certified True Copy of Records");
  assert.ok(requestableDocs.includes("Diploma"), "Should include Diploma");
  assert.ok(requestableDocs.includes("Transcript of Records"), "Should include Transcript of Records");
  assert.ok(!requestableDocs.includes("Health Information Sheet"), "Must NOT include Health Information Sheet in requestable docs");
  assert.ok(!requestableDocs.includes("Birth Certificate"), "Must NOT include Birth Certificate in requestable docs");
  assert.ok(!requestableDocs.includes("Form 137"), "Must NOT include Form 137 in requestable docs");
  assert.ok(!requestableDocs.includes("Clearance Form"), "Must NOT include Clearance Form in requestable docs");
  console.log("✓ listDocTypes({ scope: 'requestable' }) returned only requestable credentials.");

  // 2. Direct Repo Call - compliance scope filtering
  console.log("\n[Test 2] Testing listDocTypes compliance scope filtering...");
  const complianceDocs = await listDocTypes({ officeId: "registrar", scope: "compliance" });
  console.log("Compliance Registrar docs:", complianceDocs);
  assert.ok(complianceDocs.includes("Health Information Sheet"), "Should include Health Information Sheet");
  assert.ok(complianceDocs.includes("Birth Certificate"), "Should include Birth Certificate");
  assert.ok(complianceDocs.includes("Form 137"), "Should include Form 137");
  assert.ok(complianceDocs.includes("Clearance Form"), "Should include Clearance Form in compliance docs");
  assert.ok(!complianceDocs.includes("Diploma"), "Must NOT include Diploma in compliance docs");
  assert.ok(!complianceDocs.includes("Transcript of Records"), "Must NOT include Transcript of Records in compliance docs");
  console.log("✓ listDocTypes({ scope: 'compliance' }) returned only compliance requirements.");

  // 3. Direct Repo Call - listAllDocTypes metadata
  console.log("\n[Test 3] Testing listAllDocTypes returns purpose metadata...");
  const allDocRows = await listAllDocTypes({ officeId: "registrar" });
  const healthSheet = allDocRows.find((d) => d.name === "Health Information Sheet");
  assert.ok(healthSheet, "Health Information Sheet should exist in Registrar taxonomy");
  assert.equal(healthSheet.is_compliance, true, "Health sheet is_compliance must be true");
  assert.equal(healthSheet.is_requestable, false, "Health sheet is_requestable must be false");

  const diploma = allDocRows.find((d) => d.name === "Diploma");
  assert.ok(diploma, "Diploma should exist in Registrar taxonomy");
  assert.equal(diploma.is_compliance, false, "Diploma is_compliance must be false");
  assert.equal(diploma.is_requestable, true, "Diploma is_requestable must be true");
  console.log("✓ Purpose flags verified on document_types rows.");

  // 4. Test API endpoint /api/doc-types?scope=requestable
  console.log("\n[Test 4] Authenticating as Student (student@pup.local)...");
  const loginStudentRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "student@pup.local", password: "student123" }),
  });
  assert.equal(loginStudentRes.status, 200, "Student login should succeed");
  const studentAuth = extractCookies(loginStudentRes);

  console.log("\n[Test 5] Querying /api/doc-types?scope=requestable as Student...");
  const reqRes = await fetch(`${BASE_URL}/api/doc-types?scope=requestable`, {
    headers: { cookie: studentAuth.cookieHeader },
  });
  assert.equal(reqRes.status, 200);
  const reqJson = await reqRes.json();
  assert.equal(reqJson.ok, true);
  assert.ok(reqJson.data.includes("Transcript of Records"), "Must include Transcript of Records");
  assert.ok(!reqJson.data.includes("Health Information Sheet"), "Must NOT include Health Information Sheet");
  assert.ok(!reqJson.data.includes("Birth Certificate"), "Must NOT include Birth Certificate");
  assert.ok(!reqJson.data.includes("Clearance Form"), "Must NOT include Clearance Form");
  console.log("✓ Student receives strictly requestable credentials from /api/doc-types?scope=requestable.");

  // 5. Test Student Request Rejection for Compliance-only document
  console.log("\n[Test 6] Attempting to submit request for 'Health Information Sheet' (should be rejected)...");
  const badReqRes = await fetch(`${BASE_URL}/api/student/document-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: studentAuth.cookieHeader,
    },
    body: JSON.stringify({
      studentNo: "2022-10001-MN-1",
      docType: "Health Information Sheet",
      clientType: "Student",
      notes: "Need for enrollment",
    }),
  });
  assert.equal(badReqRes.status, 400, "Should reject request for non-requestable document with 400");
  const badReqJson = await badReqRes.json();
  assert.equal(badReqJson.ok, false);
  assert.ok(
    badReqJson.error.includes("inward compliance requirement"),
    `Error message should explain it is a compliance requirement: ${badReqJson.error}`
  );
  console.log("✓ Request for 'Health Information Sheet' correctly rejected with HTTP 400.");

  console.log("\n[Test 6b] Attempting to submit request for 'Clearance Form' (should be rejected)...");
  const badClearanceRes = await fetch(`${BASE_URL}/api/student/document-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: studentAuth.cookieHeader,
    },
    body: JSON.stringify({
      studentNo: "2022-10001-MN-1",
      docType: "Clearance Form",
      clientType: "Student",
      notes: "Need clearance",
    }),
  });
  assert.equal(badClearanceRes.status, 400, "Should reject request for Clearance Form with 400");
  const badClearanceJson = await badClearanceRes.json();
  assert.equal(badClearanceJson.ok, false);
  assert.ok(
    badClearanceJson.error.includes("inward compliance requirement"),
    `Error message should explain it is a compliance requirement: ${badClearanceJson.error}`
  );
  console.log("✓ Request for 'Clearance Form' correctly rejected with HTTP 400.");

  // 6. Test Student Request Success for Requestable document
  console.log("\n[Test 7] Submitting request for 'Transcript of Records' (should succeed)...");
  const goodReqRes = await fetch(`${BASE_URL}/api/student/document-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: studentAuth.cookieHeader,
    },
    body: JSON.stringify({
      studentNo: "2022-10001-MN-1",
      docType: "Transcript of Records",
      clientType: "Student",
      notes: "Scholarship application",
    }),
  });
  assert.ok(goodReqRes.status === 200 || goodReqRes.status === 201, `Should accept request for requestable document (got ${goodReqRes.status})`);
  const goodReqJson = await goodReqRes.json();
  assert.equal(goodReqJson.ok, true);
  console.log("✓ Request for 'Transcript of Records' successfully accepted.");

  // 6b. Test Staff-mediated Document Request validation
  console.log("\n[Test 7b] Testing Staff-mediated document request validation...");
  const staffLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "staff.registrar@pup.local", password: process.env.DEFAULT_STAFF_PASSWORD || "pupstaff" }),
  });
  assert.equal(staffLoginRes.status, 200, "Staff login must succeed");
  const staffAuth = extractCookies(staffLoginRes);

  const staffReqRes = await fetch(`${BASE_URL}/api/doc-types?scope=requestable`, {
    headers: { cookie: staffAuth.cookieHeader },
  });
  assert.equal(staffReqRes.status, 200);
  const staffReqJson = await staffReqRes.json();
  assert.equal(staffReqJson.ok, true);
  assert.ok(!staffReqJson.data.includes("Health Information Sheet"), "Staff requestable scope must NOT include Health Information Sheet");
  assert.ok(!staffReqJson.data.includes("Clearance Form"), "Staff requestable scope must NOT include Clearance Form");
  assert.ok(staffReqJson.data.includes("Transcript of Records"), "Staff requestable scope must include Transcript of Records");

  // Attempt staff creation for compliance document
  const badStaffReqRes = await fetch(`${BASE_URL}/api/document-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: staffAuth.cookieHeader,
    },
    body: JSON.stringify({
      studentNo: "2022-10001-MN-1",
      docType: "Health Information Sheet",
      clientType: "Student",
      notes: "Counter request",
    }),
  });
  assert.equal(badStaffReqRes.status, 400, "Staff request for compliance document must be rejected");
  const badStaffJson = await badStaffReqRes.json();
  assert.equal(badStaffJson.ok, false);
  assert.ok(badStaffJson.error.includes("inward compliance document"));
  console.log("✓ Staff request for 'Health Information Sheet' correctly rejected with HTTP 400.");

  // 7. Test Student Compliance Checklist endpoint
  console.log("\n[Test 8] Fetching /api/student/compliance...");
  const compRes = await fetch(`${BASE_URL}/api/student/compliance`, {
    headers: { cookie: studentAuth.cookieHeader },
  });
  assert.equal(compRes.status, 200);
  const compJson = await compRes.json();
  assert.equal(compJson.ok, true);
  const reqNames = (compJson.data.requirements || []).map((r) => r.docType);
  console.log("Student compliance requirements:", reqNames);
  assert.ok(reqNames.some((n) => n.includes("Health")), "Requirements should include Health Information Sheet");
  assert.ok(reqNames.some((n) => n.includes("Birth Certificate")), "Requirements should include Birth Certificate");
  assert.ok(!reqNames.includes("Diploma"), "Requirements must NOT include Diploma for enrolled student");
  assert.ok(!reqNames.includes("Copy of Grades"), "Requirements must NOT include Copy of Grades");
  console.log("✓ Student compliance requirements checklist includes only compliance documents.");

  // 8. Test Digitization Compliance Summary Denominator
  console.log("\n[Test 9] Checking digitization compliance summary denominator...");
  const compSummary = await getDigitizationComplianceSummary({
    studentStatus: "Active",
    courseCodes: ["BSIT"],
    officeId: "registrar",
  });
  console.log("Compliance summary total expected doc types count per student:", compSummary.summary);
  assert.ok(compSummary.summary, "Compliance summary should exist");
  console.log("✓ Digitization compliance calculation completed without error.");

  console.log("\n=== ALL DOCUMENT TYPES PARTITIONING TESTS PASSED ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

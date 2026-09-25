import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import assert from "node:assert/strict";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

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

async function createDummyPdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawText("TEST EVENT PROPOSAL - STUDENT SUBMISSION", { x: 50, y: 700, size: 14, font, color: rgb(0.5, 0, 0) });
  return Buffer.from(await doc.save());
}

async function runOsasTests() {
  console.log("=== STARTING OSAS MONITORING END-TO-END TEST SUITE ===");

  // 1. Authenticate as OSAS Admin
  console.log("\n[Test 1] Authenticating as OSAS Admin (admin.osas@pup.local)...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin.osas@pup.local", password: "pupstaff" }),
  });
  assert.equal(loginRes.status, 200, "OSAS Admin login HTTP status should be 200");
  const loginJson = await loginRes.json();
  assert.equal(loginJson.ok, true, "OSAS Admin login response ok should be true");
  assert.equal(loginJson.data.office_id, "osas", "Authenticated user office should be 'osas'");
  const osasAuth = extractCookies(loginRes);
  assert.ok(osasAuth.cookieHeader, "Session cookie must be received upon login");
  assert.ok(osasAuth.csrfToken, "CSRF cookie must be received upon login");
  console.log("✓ Authenticated as OSAS Admin successfully.");

  // 2. Query Active Event Proposals
  console.log("\n[Test 2] Querying active event proposals (GET /api/osas/event-proposals)...");
  const activeRes = await fetch(`${BASE_URL}/api/osas/event-proposals`, {
    headers: { cookie: osasAuth.cookieHeader },
  });
  assert.equal(activeRes.status, 200, "Active proposals status should be 200");
  const activeJson = await activeRes.json();
  assert.equal(activeJson.ok, true, "Active proposals response ok should be true");
  assert.ok(Array.isArray(activeJson.data), "Data should be an array");
  console.log(`✓ Active proposals count: ${activeJson.data.length}`);
  assert.ok(activeJson.data.length >= 5, "Expected at least 5 active proposals");

  const statusesFound = new Set(activeJson.data.map((p) => p.status));
  console.log("  Active statuses present:", Array.from(statusesFound).join(", "));
  assert.ok(statusesFound.has("Submitted"), "Should contain 'Submitted' proposals");
  assert.ok(statusesFound.has("Under Review"), "Should contain 'Under Review' proposals");
  assert.ok(statusesFound.has("Approved"), "Should contain 'Approved' proposals");

  for (const item of activeJson.data) {
    assert.equal(item.archived_at, null, "Active proposals must have archived_at === null");
    assert.ok(item.title, "Proposal must have a title");
    assert.ok(item.organization_name, "Proposal must have an organization_name");
    assert.ok(item.student_name, "Proposal must have a student_name joined from students table");
  }
  console.log("✓ All active proposals passed data validation.");

  // 3. Verify No Archived Proposals Exist
  console.log("\n[Test 3] Verifying zero archived event proposals exist in OSAS monitoring...");
  const verifyNoArchivedRes = await fetch(`${BASE_URL}/api/osas/event-proposals`, {
    headers: { cookie: osasAuth.cookieHeader },
  });
  assert.equal(verifyNoArchivedRes.status, 200, "Proposals query status should be 200");
  const verifyNoArchivedJson = await verifyNoArchivedRes.json();
  assert.equal(verifyNoArchivedJson.ok, true, "Proposals response ok should be true");
  const archivedFound = verifyNoArchivedJson.data.filter((p) => p.status === "Archived" || p.archived_at !== null);
  assert.equal(archivedFound.length, 0, "No archived proposals should be returned in OSAS monitoring");
  console.log("✓ Verified zero archived proposals present in monitoring queue.");

  // 4. Inspect a single proposal and its updates timeline
  const targetProposal = activeJson.data[0];
  console.log(`\n[Test 4] Inspecting proposal details (GET /api/osas/event-proposals/${targetProposal.id})...`);
  const detailRes = await fetch(`${BASE_URL}/api/osas/event-proposals/${targetProposal.id}`, {
    headers: { cookie: osasAuth.cookieHeader },
  });
  assert.equal(detailRes.status, 200, "Detail status should be 200");
  const detailJson = await detailRes.json();
  assert.equal(detailJson.ok, true, "Detail response ok should be true");
  assert.equal(detailJson.data.id, targetProposal.id, "ID must match requested proposal");
  assert.ok(Array.isArray(detailJson.data.updates), "Updates timeline must be an array");
  console.log(`✓ Proposal "${detailJson.data.title}" has ${detailJson.data.updates.length} timeline update(s).`);
  for (const u of detailJson.data.updates) {
    console.log(`    - [${u.status}] ${u.message}`);
  }

  // 5. Stream proposal PDF file
  console.log(`\n[Test 5] Streaming proposal PDF (GET /api/osas/event-proposals/${targetProposal.id}?file=1)...`);
  const fileRes = await fetch(`${BASE_URL}/api/osas/event-proposals/${targetProposal.id}?file=1`, {
    headers: { cookie: osasAuth.cookieHeader },
  });
  assert.equal(fileRes.status, 200, "PDF stream status should be 200");
  assert.equal(fileRes.headers.get("content-type"), "application/pdf", "Content-Type must be application/pdf");
  const fileBuffer = await fileRes.arrayBuffer();
  console.log(`✓ PDF stream successful (${fileBuffer.byteLength} bytes received).`);
  assert.ok(fileBuffer.byteLength > 500, "PDF file size should be > 500 bytes");

  // 6. Update Proposal Status and Publish Note
  console.log(`\n[Test 6] Publishing status update on proposal ${targetProposal.id}...`);
  const updateRes = await fetch(`${BASE_URL}/api/osas/event-proposals/${targetProposal.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: osasAuth.cookieHeader,
      "x-csrf-token": osasAuth.csrfToken,
    },
    body: JSON.stringify({
      status: "Under Review",
      note: "Automated verification test note published by OSAS Directorate.",
    }),
  });
  assert.equal(updateRes.status, 200, "Status update should return 200");
  const updateJson = await updateRes.json();
  assert.equal(updateJson.ok, true, "Update response ok should be true");
  assert.equal(updateJson.data.status, "Under Review", "Proposal status must be updated to 'Under Review'");

  // Re-fetch detail to verify new update entry
  const verifyRes = await fetch(`${BASE_URL}/api/osas/event-proposals/${targetProposal.id}`, {
    headers: { cookie: osasAuth.cookieHeader },
  });
  const verifyJson = await verifyRes.json();
  const latestUpdate = verifyJson.data.updates[verifyJson.data.updates.length - 1];
  assert.equal(latestUpdate.status, "Under Review");
  assert.ok(latestUpdate.message.includes("Automated verification test note"));
  console.log("✓ Status update successfully published and verified in timeline.");

  // 7. Student Submission Workflow
  console.log("\n[Test 7] Testing student event proposal submission flow...");
  // Login as unwhitelisted student to verify 403 security enforcement
  const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "student@pup.local", password: "student123" }),
  });
  assert.equal(studentLoginRes.status, 200, "Student login should return 200");
  const unwhitelistedAuth = extractCookies(studentLoginRes);

  const pdfBytes = await createDummyPdf();
  const unwhitelistedFormData = new FormData();
  unwhitelistedFormData.append("title", "Unauthorized Test Proposal");
  unwhitelistedFormData.append("organizationName", "Computer Science Guild");
  unwhitelistedFormData.append("eventDate", "2026-11-20");
  unwhitelistedFormData.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "test-proposal.pdf");

  const unwhitelistedSubmitRes = await fetch(`${BASE_URL}/api/student/event-proposals`, {
    method: "POST",
    headers: {
      cookie: unwhitelistedAuth.cookieHeader,
      "x-csrf-token": unwhitelistedAuth.csrfToken,
    },
    body: unwhitelistedFormData,
  });
  assert.equal(unwhitelistedSubmitRes.status, 403, "Unwhitelisted officer submission must be blocked with 403");
  console.log("✓ Verified unwhitelisted officer submission is properly blocked (403).");

  // Login as whitelisted student officer (test.student@pup.local)
  const whitelistedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "test.student@pup.local", password: "student123" }),
  });
  assert.equal(whitelistedLoginRes.status, 200, "Whitelisted student login should return 200");
  const studentAuth = extractCookies(whitelistedLoginRes);

  const formData = new FormData();
  formData.append("title", "Automated Test Coding Competition 2026");
  formData.append("organizationId", "helping-hands");
  formData.append("organizationName", "Helping Hands Community Organization");
  formData.append("eventDate", "2026-11-20");
  formData.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "automated-test-proposal.pdf");

  const submitRes = await fetch(`${BASE_URL}/api/student/event-proposals`, {
    method: "POST",
    headers: {
      cookie: studentAuth.cookieHeader,
      "x-csrf-token": studentAuth.csrfToken,
    },
    body: formData,
  });
  assert.equal(submitRes.status, 201, "Whitelisted officer submission should return 201");
  const submitJson = await submitRes.json();
  assert.equal(submitJson.ok, true, "Submission ok should be true");
  const createdProposalId = submitJson.data.id;
  console.log(`✓ Whitelisted officer successfully submitted proposal with ID: ${createdProposalId}`);

  // Retrieve student's proposals
  const studentListRes = await fetch(`${BASE_URL}/api/student/event-proposals`, {
    headers: { cookie: studentAuth.cookieHeader },
  });
  assert.equal(studentListRes.status, 200, "Student proposal list status should be 200");
  const studentListJson = await studentListRes.json();
  const foundInStudentList = studentListJson.data.find((p) => String(p.id) === String(createdProposalId));
  assert.ok(foundInStudentList, "Newly created proposal must appear in student's submissions");
  console.log("✓ Proposal confirmed in student view.");

  // Verify OSAS can see the new student proposal
  const osasReviewListRes = await fetch(`${BASE_URL}/api/osas/event-proposals`, {
    headers: { cookie: osasAuth.cookieHeader },
  });
  const osasReviewListJson = await osasReviewListRes.json();
  const foundInOsasList = osasReviewListJson.data.find((p) => String(p.id) === String(createdProposalId));
  assert.ok(foundInOsasList, "Newly submitted proposal must appear in OSAS monitoring list");
  console.log("✓ Proposal confirmed in OSAS monitoring queue.");

  // 8. Update test proposal status to Approved
  console.log(`\n[Test 8] Updating test proposal status (PATCH /api/osas/event-proposals/${createdProposalId} status: 'Approved')...`);
  const approveActionRes = await fetch(`${BASE_URL}/api/osas/event-proposals/${createdProposalId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: osasAuth.cookieHeader,
      "x-csrf-token": osasAuth.csrfToken,
    },
    body: JSON.stringify({ status: "Approved", note: "Approved during automated testing." }),
  });
  assert.equal(approveActionRes.status, 200, "Approve action status should be 200");
  const approveActionJson = await approveActionRes.json();
  assert.equal(approveActionJson.ok, true, "Approve action response ok should be true");
  assert.equal(approveActionJson.data.status, "Approved", "Status must become 'Approved'");
  console.log("✓ Proposal approved successfully.");

  // Clean up automated test fixtures from database
  const { query: dbQuery } = await import("../src/lib/postgres.js");
  await dbQuery("DELETE FROM transaction_updates WHERE event_proposal_id = $1", [createdProposalId]);
  await dbQuery("DELETE FROM event_proposals WHERE id = $1", [createdProposalId]);
  console.log("✓ Test proposal cleaned up from database.");

  console.log("\n=========================================================");
  console.log("🎉 ALL OSAS MONITORING END-TO-END TESTS PASSED!");
  console.log("=========================================================");
}

runOsasTests().catch((err) => {
  console.error("\n❌ OSAS TEST FAILED:", err);
  process.exit(1);
});

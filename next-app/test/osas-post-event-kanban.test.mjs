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

async function createDummyPdf(title) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawText(title, { x: 50, y: 700, size: 14, font, color: rgb(0.5, 0, 0) });
  return Buffer.from(await doc.save());
}

async function runPostEventKanbanGuardsTest() {
  console.log("=== STARTING OSAS POST-EVENT KANBAN & STATE MACHINE TEST SUITE ===");

  let testProposalId = null;
  let testReportId = null;

  try {
    // 1. Authenticate OSAS Admin
    console.log("\n[Step 1] Authenticating OSAS Admin...");
    const osasLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin.osas@pup.local", password: "pupstaff" }),
    });
    assert.equal(osasLoginRes.status, 200);
    const osasAuth = extractCookies(osasLoginRes);
    console.log("  ✓ OSAS Admin authenticated");

    // 2. Authenticate Whitelisted Student Officer
    console.log("\n[Step 2] Authenticating whitelisted student officer...");
    const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "test.student@pup.local", password: "student123" }),
    });
    assert.equal(studentLoginRes.status, 200);
    const studentAuth = extractCookies(studentLoginRes);
    console.log("  ✓ Student officer authenticated");

    // 3. Create a proposal and approve it so post-event reporting becomes active
    console.log("\n[Step 3] Submitting and approving pre-event proposal...");
    const proposalPdf = await createDummyPdf("PRE-EVENT PROPOSAL FOR POST-EVENT TEST");
    const pForm = new FormData();
    pForm.append("title", "Post-Event Pipeline Target Event 2026");
    pForm.append("organizationId", "helping-hands");
    pForm.append("organizationName", "Helping Hands Community Organization");
    pForm.append("eventDate", "2026-11-20");
    pForm.append("file", new Blob([proposalPdf], { type: "application/pdf" }), "target-event.pdf");

    const pRes = await fetch(`${BASE_URL}/api/student/event-proposals`, {
      method: "POST",
      headers: {
        cookie: studentAuth.cookieHeader,
        "x-csrf-token": studentAuth.csrfToken,
      },
      body: pForm,
    });
    assert.equal(pRes.status, 201);
    const pJson = await pRes.json();
    testProposalId = pJson.data.id;

    // Approve the proposal
    const approveProposalRes = await fetch(`${BASE_URL}/api/osas/event-proposals/${testProposalId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: osasAuth.cookieHeader,
        "x-csrf-token": osasAuth.csrfToken,
      },
      body: JSON.stringify({ status: "Approved", note: "Approved for testing post-event." }),
    });
    assert.equal(approveProposalRes.status, 200);
    console.log(`  ✓ Proposal #${testProposalId} approved; post_event_status is Pending Submission`);

    // 4. Submit Post-Event Report
    console.log("\n[Step 4] Submitting student post-event narrative and liquidation report...");
    const narrativePdf = await createDummyPdf("POST-EVENT NARRATIVE REPORT");
    const liquidationPdf = await createDummyPdf("POST-EVENT LIQUIDATION PACKAGE");
    const peForm = new FormData();
    peForm.append("eventProposalId", String(testProposalId));
    peForm.append("organizationId", "helping-hands");
    peForm.append("actualAttendance", "125");
    peForm.append("totalExpenses", "4850.50");
    peForm.append("narrativeFile", new Blob([narrativePdf], { type: "application/pdf" }), "narrative.pdf");
    peForm.append("liquidationFile", new Blob([liquidationPdf], { type: "application/pdf" }), "liquidation.pdf");

    const submitReportRes = await fetch(`${BASE_URL}/api/student/post-event-reports`, {
      method: "POST",
      headers: {
        cookie: studentAuth.cookieHeader,
        "x-csrf-token": studentAuth.csrfToken,
      },
      body: peForm,
    });
    assert.equal(submitReportRes.status, 201);
    const submitJson = await submitReportRes.json();
    testReportId = submitJson.data.id;
    assert.equal(submitJson.data.status, "Submitted");
    console.log(`  ✓ Post-Event Report #${testReportId} submitted with initial status 'Submitted'`);

    // Helper for patching post-event report
    const patchReport = async (status, note) => {
      const res = await fetch(`${BASE_URL}/api/osas/post-event-reports/${testReportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: osasAuth.cookieHeader,
          "x-csrf-token": osasAuth.csrfToken,
        },
        body: JSON.stringify({ status, note }),
      });
      const json = await res.json();
      return { status: res.status, json };
    };

    // 5. Test Disallowed Jump: Submitted -> Needs Revision (must start review first)
    console.log("\n[Step 5] Testing disallowed transition: 'Submitted' -> 'Needs Revision'...");
    const badSubmittedToRevision = await patchReport("Needs Revision", "Please revise narrative.");
    assert.equal(badSubmittedToRevision.status, 400, "Should return HTTP 400 for invalid transition");
    assert.equal(badSubmittedToRevision.json.ok, false);
    console.log(`  ✓ Blocked illegal transition: "${badSubmittedToRevision.json.error}"`);

    // 6. Test Valid Forward Transition: Submitted -> Under Review
    console.log("\n[Step 6] Testing valid transition: 'Submitted' -> 'Under Review'...");
    const toUnderReview = await patchReport("Under Review", "OSAS started clearance review.");
    assert.equal(toUnderReview.status, 200);
    assert.equal(toUnderReview.json.ok, true);
    assert.equal(toUnderReview.json.data.status, "Under Review");
    console.log("  ✓ Successfully moved to 'Under Review'");

    // 7. Test STRICT FORWARD-ONLY GUARD: Under Review -> Submitted (MUST BE BLOCKED)
    console.log("\n[Step 7] Testing STRICT forward-only guard: 'Under Review' -> 'Submitted'...");
    const badReviewToSubmitted = await patchReport("Submitted", "Try to un-review report.");
    assert.equal(badReviewToSubmitted.status, 400, "Should return HTTP 400 because Under Review is forward-only!");
    assert.equal(badReviewToSubmitted.json.ok, false);
    console.log(`  ✓ Blocked backward drag to Submitted: "${badReviewToSubmitted.json.error}"`);

    // 8. Test Needs Revision Guard: Under Review -> Needs Revision WITHOUT note
    console.log("\n[Step 8] Testing revision guard: 'Under Review' -> 'Needs Revision' without instructions note...");
    const badRevisionWithoutNote = await patchReport("Needs Revision", "");
    assert.equal(badRevisionWithoutNote.status, 400);
    assert.equal(badRevisionWithoutNote.json.ok, false);
    console.log(`  ✓ Blocked missing instructions note: "${badRevisionWithoutNote.json.error}"`);

    // 9. Test Needs Revision WITH detailed instructions
    console.log("\n[Step 9] Testing revision with detailed instructions...");
    const validRevision = await patchReport("Needs Revision", "Please attach official receipts for catering items.");
    assert.equal(validRevision.status, 200);
    assert.equal(validRevision.json.ok, true);
    assert.equal(validRevision.json.data.status, "Needs Revision");
    console.log("  ✓ Moved to 'Needs Revision' with instructions recorded");

    // 10. Test Disallowed Jump: Needs Revision -> Cleared directly (must resume Under Review)
    console.log("\n[Step 10] Testing disallowed leap: 'Needs Revision' -> 'Cleared' directly...");
    const badRevisionToCleared = await patchReport("Cleared", "Jump directly to cleared.");
    assert.equal(badRevisionToCleared.status, 400);
    assert.equal(badRevisionToCleared.json.ok, false);
    console.log(`  ✓ Blocked illegal transition: "${badRevisionToCleared.json.error}"`);

    // 11. Test Transition: Needs Revision -> Declined
    console.log("\n[Step 11] Testing transition: 'Needs Revision' -> 'Declined'...");
    const toDeclined = await patchReport("Declined", "Organization failed to liquidate within policy window.");
    assert.equal(toDeclined.status, 200);
    assert.equal(toDeclined.json.ok, true);
    assert.equal(toDeclined.json.data.status, "Declined");
    console.log("  ✓ Moved to 'Declined'");

    // 12. Test Reopening Guard: Declined -> Under Review WITHOUT note
    console.log("\n[Step 12] Testing reopen guard: 'Declined' -> 'Under Review' without appeal note...");
    const badReopenWithoutNote = await patchReport("Under Review", "");
    assert.equal(badReopenWithoutNote.status, 400);
    assert.equal(badReopenWithoutNote.json.ok, false);
    console.log(`  ✓ Blocked missing appeal note: "${badReopenWithoutNote.json.error}"`);

    // 13. Test Reopening WITH appeal note
    console.log("\n[Step 13] Testing reopen: 'Declined' -> 'Under Review' with appeal note...");
    const validReopen = await patchReport("Under Review", "Formal request for liquidation reconsideration accepted.");
    assert.equal(validReopen.status, 200);
    assert.equal(validReopen.json.ok, true);
    assert.equal(validReopen.json.data.status, "Under Review");
    console.log("  ✓ Reopened to 'Under Review'");

    // 14. Test Transition: Under Review -> Cleared
    console.log("\n[Step 14] Testing clearance: 'Under Review' -> 'Cleared'...");
    const toCleared = await patchReport("Cleared", "All receipts and narratives verified. Full clearance granted.");
    assert.equal(toCleared.status, 200);
    assert.equal(toCleared.json.ok, true);
    assert.equal(toCleared.json.data.status, "Cleared");
    console.log("  ✓ Post-event clearance granted ('Cleared')");

    // 15. Test Revocation Guard: Cleared -> Under Review WITHOUT note
    console.log("\n[Step 15] Testing revocation guard: 'Cleared' -> 'Under Review' without justification note...");
    const badRevokeWithoutNote = await patchReport("Under Review", "");
    assert.equal(badRevokeWithoutNote.status, 400);
    assert.equal(badRevokeWithoutNote.json.ok, false);
    console.log(`  ✓ Blocked missing note on revoking clearance: "${badRevokeWithoutNote.json.error}"`);

    // 16. Test Revocation WITH justification note
    console.log("\n[Step 16] Testing revocation: 'Cleared' -> 'Under Review' with justification note...");
    const validRevoke = await patchReport("Under Review", "Auditor detected missing liquidation receipt for printing fees.");
    assert.equal(validRevoke.status, 200);
    assert.equal(validRevoke.json.ok, true);
    assert.equal(validRevoke.json.data.status, "Under Review");
    console.log("  ✓ Clearance revoked with written audit record");

    // 17. Verify API list returns decrypted student names and correct counts
    console.log("\n[Step 17] Verifying OSAS list API includes student names and valid fields...");
    const listRes = await fetch(`${BASE_URL}/api/osas/post-event-reports`, {
      headers: {
        cookie: osasAuth.cookieHeader,
      },
    });
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    assert.equal(listJson.ok, true);
    const foundReport = listJson.data.find((r) => r.id === testReportId);
    assert.ok(foundReport, "Test report should be present in post-event list");
    assert.equal(foundReport.status, "Under Review");
    assert.ok(foundReport.student_name, "student_name must be populated and decrypted");
    console.log(`  ✓ Found report in OSAS list with student: "${foundReport.student_name}"`);

    console.log("\n=========================================================");
    console.log("🎉 ALL OSAS POST-EVENT KANBAN & STATE MACHINE TESTS PASSED 100%!");
    console.log("=========================================================");
  } finally {
    console.log("\n[Cleanup] Cleaning up test records from database...");
    const { query: dbQuery } = await import("../src/lib/postgres.js");
    if (testReportId) {
      await dbQuery("DELETE FROM osas_post_event_reports WHERE id = $1", [testReportId]);
    }
    if (testProposalId) {
      await dbQuery("DELETE FROM transaction_updates WHERE event_proposal_id = $1", [testProposalId]);
      await dbQuery("DELETE FROM event_proposals WHERE id = $1", [testProposalId]);
    }
    console.log("  ✓ Test records cleaned up successfully.");
  }
}

runPostEventKanbanGuardsTest().catch((err) => {
  console.error("\n❌ OSAS POST-EVENT TEST FAILED:", err);
  process.exit(1);
});

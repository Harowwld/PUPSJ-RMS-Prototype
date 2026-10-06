import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import assert from "node:assert/strict";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

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

async function createDummyPdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawText("TEST EVENT PROPOSAL - STATE MACHINE VERIFICATION", { x: 50, y: 700, size: 14, font, color: rgb(0.5, 0, 0) });
  return Buffer.from(await doc.save());
}

async function runGuardsTest() {
  console.log("=== STARTING OSAS GUARDED STATE MACHINE TEST SUITE ===");

  let testProposalId = null;

  try {
    // 1. Authenticate OSAS Admin
    console.log("\n[Step 1] Authenticating OSAS Admin...");
    const osasLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin.osas@pup.local", password: STAFF_PASSWORD }),
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

    // 3. Create a fresh test event proposal
    console.log("\n[Step 3] Submitting fresh event proposal...");
    const pdfBytes = await createDummyPdf();
    const formData = new FormData();
    formData.append("title", "State Machine Guarded Pipeline Test 2026");
    formData.append("organizationId", "helping-hands");
    formData.append("organizationName", "Helping Hands Community Organization");
    formData.append("eventDate", "2026-12-01");
    formData.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "guard-test.pdf");

    const createRes = await fetch(`${BASE_URL}/api/student/event-proposals`, {
      method: "POST",
      headers: {
        cookie: studentAuth.cookieHeader,
        "x-csrf-token": studentAuth.csrfToken,
      },
      body: formData,
    });
    assert.equal(createRes.status, 201);
    const createJson = await createRes.json();
    testProposalId = createJson.data.id;
    assert.equal(createJson.data.status, "Submitted");
    console.log(`  ✓ Proposal created with ID: ${testProposalId}, initial status: 'Submitted'`);

    // Helper patch function
    const patchStatus = async (status, note) => {
      const res = await fetch(`${BASE_URL}/api/osas/event-proposals/${testProposalId}`, {
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

    // 4. Test Disallowed Transition: Submitted -> Needs Revision (should be blocked)
    console.log("\n[Step 4] Testing disallowed jump: 'Submitted' -> 'Needs Revision'...");
    const badRevisionRes = await patchStatus("Needs Revision", "Please fix item.");
    assert.equal(badRevisionRes.status, 400, "Should return HTTP 400 for illegal transition");
    assert.equal(badRevisionRes.json.ok, false);
    console.log(`  ✓ Blocked with error: "${badRevisionRes.json.error}"`);

    // 5. Test Valid Forward Transition: Submitted -> Under Review
    console.log("\n[Step 5] Testing valid transition: 'Submitted' -> 'Under Review'...");
    const reviewRes = await patchStatus("Under Review", "OSAS started evaluation.");
    assert.equal(reviewRes.status, 200);
    assert.equal(reviewRes.json.ok, true);
    assert.equal(reviewRes.json.data.status, "Under Review");
    console.log("  ✓ Moved to 'Under Review'");

    // 6. Test Disallowed Backward Transition: Under Review -> Submitted (Must be blocked)
    console.log("\n[Step 6] Testing disallowed backward transition: 'Under Review' -> 'Submitted'...");
    const badReviewToSubmitted = await patchStatus("Submitted", "Try to un-review.");
    assert.equal(badReviewToSubmitted.status, 400, "Should return HTTP 400 for illegal backward transition to Submitted");
    assert.equal(badReviewToSubmitted.json.ok, false);
    console.log(`  ✓ Blocked with error: "${badReviewToSubmitted.json.error}"`);

    // 7. Test Valid Transition: Under Review -> Approved
    console.log("\n[Step 7] Testing valid transition: 'Under Review' -> 'Approved'...");
    const approveRes = await patchStatus("Approved", "Approved for campus execution.");
    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.json.ok, true);
    assert.equal(approveRes.json.data.status, "Approved");
    assert.equal(approveRes.json.data.post_event_status, "Pending Submission");
    assert.ok(approveRes.json.data.post_event_due_date, "Due date must be generated upon approval");
    console.log("  ✓ Approved successfully; post_event_status is 'Pending Submission'");

    // 8. Test Disallowed Transition: Approved -> Submitted (terminal jump blocked)
    console.log("\n[Step 8] Testing disallowed jump: 'Approved' -> 'Submitted'...");
    const badApprovedToSubmitted = await patchStatus("Submitted", "Try to un-submit approved.");
    assert.equal(badApprovedToSubmitted.status, 400);
    assert.equal(badApprovedToSubmitted.json.ok, false);
    console.log(`  ✓ Blocked with error: "${badApprovedToSubmitted.json.error}"`);

    // 9. Test Revocation Guard: Approved -> Under Review WITHOUT note
    console.log("\n[Step 9] Testing revocation guard: 'Approved' -> 'Under Review' without note...");
    const revokeWithoutNote = await patchStatus("Under Review", "");
    assert.equal(revokeWithoutNote.status, 400);
    assert.equal(revokeWithoutNote.json.ok, false);
    console.log(`  ✓ Blocked missing note: "${revokeWithoutNote.json.error}"`);

    // 10. Test Revocation WITH Justification Note & Verify Post-Event Rollback
    console.log("\n[Step 10] Testing revocation: 'Approved' -> 'Under Review' with note...");
    const revokeWithNote = await patchStatus("Under Review", "Revoked approval due to scheduling conflict with university convocation.");
    assert.equal(revokeWithNote.status, 200);
    assert.equal(revokeWithNote.json.ok, true);
    assert.equal(revokeWithNote.json.data.status, "Under Review");
    assert.equal(revokeWithNote.json.data.post_event_status, "Not Applicable", "post_event_status must roll back to 'Not Applicable'");
    assert.equal(revokeWithNote.json.data.post_event_due_date, null, "post_event_due_date must be cleared");
    console.log("  ✓ Successfully revoked approval; post-event compliance requirement cleanly rolled back!");

    // 11. Test Needs Revision Guard: Under Review -> Needs Revision WITHOUT note
    console.log("\n[Step 11] Testing revision guard: 'Under Review' -> 'Needs Revision' without note...");
    const revisionWithoutNote = await patchStatus("Needs Revision", "");
    assert.equal(revisionWithoutNote.status, 400);
    assert.equal(revisionWithoutNote.json.ok, false);
    console.log(`  ✓ Blocked missing note: "${revisionWithoutNote.json.error}"`);

    // 12. Test Needs Revision WITH feedback notes
    console.log("\n[Step 12] Testing revision with feedback notes...");
    const revisionWithNote = await patchStatus("Needs Revision", "Please attach the revised campus security approval letter.");
    assert.equal(revisionWithNote.status, 200);
    assert.equal(revisionWithNote.json.ok, true);
    assert.equal(revisionWithNote.json.data.status, "Needs Revision");
    console.log("  ✓ Moved to 'Needs Revision' with feedback recorded");

    // 13. Test Disallowed Leap: Needs Revision -> Approved directly (must resume review first)
    console.log("\n[Step 13] Testing disallowed jump: 'Needs Revision' -> 'Approved' directly...");
    const badRevisionToApproved = await patchStatus("Approved", "Jump directly to approved.");
    assert.equal(badRevisionToApproved.status, 400);
    assert.equal(badRevisionToApproved.json.ok, false);
    console.log(`  ✓ Blocked with error: "${badRevisionToApproved.json.error}"`);

    // 14. Test Transition: Needs Revision -> Declined
    console.log("\n[Step 14] Testing transition: 'Needs Revision' -> 'Declined'...");
    const declineRes = await patchStatus("Declined", "Organization did not submit revisions within deadline.");
    assert.equal(declineRes.status, 200);
    assert.equal(declineRes.json.ok, true);
    assert.equal(declineRes.json.data.status, "Declined");
    console.log("  ✓ Moved to 'Declined'");

    // 15. Test Reopen Guard: Declined -> Under Review WITHOUT note
    console.log("\n[Step 15] Testing reopen guard: 'Declined' -> 'Under Review' without note...");
    const reopenWithoutNote = await patchStatus("Under Review", "");
    assert.equal(reopenWithoutNote.status, 400);
    assert.equal(reopenWithoutNote.json.ok, false);
    console.log(`  ✓ Blocked missing note: "${reopenWithoutNote.json.error}"`);

    // 16. Test Reopen WITH appeal grounds note
    console.log("\n[Step 16] Testing reopening 'Declined' with appeal grounds note...");
    const reopenWithNote = await patchStatus("Under Review", "Reopened following formal appeal letter approved by OSAS director.");
    assert.equal(reopenWithNote.status, 200);
    assert.equal(reopenWithNote.json.ok, true);
    assert.equal(reopenWithNote.json.data.status, "Under Review");
    console.log("  ✓ Successfully reopened proposal for review");

    console.log("\n=========================================================");
    console.log("🎉 ALL GUARDED STATE MACHINE TESTS PASSED 100%!");
    console.log("=========================================================");
  } finally {
    if (testProposalId) {
      console.log("\n[Cleanup] Cleaning up test records from database...");
      const { query: dbQuery } = await import("../src/lib/postgres.js");
      await dbQuery("DELETE FROM transaction_updates WHERE event_proposal_id = $1", [testProposalId]);
      await dbQuery("DELETE FROM event_proposals WHERE id = $1", [testProposalId]);
      console.log("  ✓ Test records cleaned up successfully.");
    }
  }
}

runGuardsTest().catch((err) => {
  console.error("\n❌ STATE MACHINE TEST FAILED:", err);
  process.exit(1);
});

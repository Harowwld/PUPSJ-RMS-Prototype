import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const { query } = await import("../src/lib/postgres.js");
const { sysDbRun } = await import("../src/lib/systemDb.js");

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

async function createTestPdf(title = "TEST DOCUMENT") {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawText(title, { x: 50, y: 700, size: 14, font, color: rgb(0.5, 0, 0) });
  page.drawText(`Generated at: ${new Date().toISOString()}`, { x: 50, y: 670, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
  return Buffer.from(await doc.save());
}

async function runTests() {
  console.log("=== STARTING OSAS POST-EVENT REPORTS WORKFLOW E2E TEST ===");

  // Reset rate limits to prevent 429 during testing
  try {
    await sysDbRun("DELETE FROM rate_limit_hits");
    await sysDbRun("DELETE FROM rate_limit_violations");
  } catch {}

  let testProposalId = null;
  let testReportId = null;

  try {
    // -------------------------------------------------------------
    // Step 1: Authentication
    // -------------------------------------------------------------
    console.log("\n[Step 1] Authenticating users...");
    // 1a. OSAS Admin
    const osasLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin.osas@pup.local", password: STAFF_PASSWORD }),
    });
    assert.equal(osasLoginRes.status, 200, "OSAS Admin login status should be 200");
    const osasAuth = extractCookies(osasLoginRes);
    console.log("  ✓ OSAS Admin authenticated");

    // 1b. Whitelisted Student Officer
    const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "test.student@pup.local", password: "student123" }),
    });
    assert.equal(studentLoginRes.status, 200, "Whitelisted student login status should be 200");
    const studentAuth = extractCookies(studentLoginRes);
    console.log("  ✓ Whitelisted Student Officer authenticated");

    // 1c. Unwhitelisted Student
    const unwhitelistedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "student@pup.local", password: "student123" }),
    });
    assert.equal(unwhitelistedLoginRes.status, 200, "Unwhitelisted student login status should be 200");
    const unwhitelistedAuth = extractCookies(unwhitelistedLoginRes);
    console.log("  ✓ Unwhitelisted Student authenticated");

    // -------------------------------------------------------------
    // Step 2: Security Boundaries (403 for unwhitelisted student)
    // -------------------------------------------------------------
    console.log("\n[Step 2] Testing security authorization boundaries (403)...");
    const dummyPdf = await createTestPdf("UNAUTHORIZED ATTEMPT");

    // 2a. Post-event submission by unwhitelisted student (student@pup.local is not an officer for jpcs)
    const unwhitelistedReportForm = new FormData();
    unwhitelistedReportForm.append("eventProposalId", "1");
    unwhitelistedReportForm.append("organizationId", "jpcs");
    unwhitelistedReportForm.append("narrativeFile", new Blob([dummyPdf], { type: "application/pdf" }), "unauth.pdf");

    const unauthReportRes = await fetch(`${BASE_URL}/api/student/post-event-reports`, {
      method: "POST",
      headers: {
        cookie: unwhitelistedAuth.cookieHeader,
        "x-csrf-token": unwhitelistedAuth.csrfToken,
      },
      body: unwhitelistedReportForm,
    });
    assert.equal(unauthReportRes.status, 403, "Unwhitelisted student must be rejected with 403 on post-event submission");
    console.log("  ✓ Post-event submission properly blocked for non-officers (403)");

    // -------------------------------------------------------------
    // Step 3: Event Proposal Approval -> Trigger Post-Event Requirement
    // -------------------------------------------------------------
    console.log("\n[Step 3] Submitting event proposal and approving to schedule post-event compliance...");
    const proposalPdf = await createTestPdf("PROPOSAL FOR POST-EVENT TEST");
    const proposalForm = new FormData();
    proposalForm.append("title", "Community Tech Outreach & Code Camp 2026");
    proposalForm.append("organizationId", "helping-hands");
    proposalForm.append("organizationName", "Helping Hands Community Organization");
    proposalForm.append("eventDate", "2026-11-15");
    proposalForm.append("file", new Blob([proposalPdf], { type: "application/pdf" }), "tech-outreach-proposal.pdf");

    const submitProposalRes = await fetch(`${BASE_URL}/api/student/event-proposals`, {
      method: "POST",
      headers: {
        cookie: studentAuth.cookieHeader,
        "x-csrf-token": studentAuth.csrfToken,
      },
      body: proposalForm,
    });
    assert.equal(submitProposalRes.status, 201, "Submitting proposal should return 201");
    const submitProposalJson = await submitProposalRes.json();
    testProposalId = submitProposalJson.data.id;
    console.log(`  ✓ Event proposal submitted with ID: ${testProposalId}`);

    // Approve Proposal via OSAS Staff
    const approveProposalRes = await fetch(`${BASE_URL}/api/osas/event-proposals/${testProposalId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: osasAuth.cookieHeader,
      },
      body: JSON.stringify({
        status: "Approved",
        note: "Approved by OSAS for campus implementation.",
      }),
    });
    assert.equal(approveProposalRes.status, 200, "Approving proposal should return 200");
    const approveProposalJson = await approveProposalRes.json();
    assert.equal(approveProposalJson.data.status, "Approved");
    assert.equal(
      approveProposalJson.data.post_event_status,
      "Pending Submission",
      "Approved proposal must automatically have post_event_status set to Pending Submission"
    );
    console.log("  ✓ Proposal approved; post_event_status set to 'Pending Submission'");

    // -------------------------------------------------------------
    // Step 4: Whitelisted Officer Submits Post-Event & Liquidation Report
    // -------------------------------------------------------------
    console.log("\n[Step 4] Whitelisted officer submits post-event & liquidation report...");
    const narrativePdf = await createTestPdf("POST-EVENT ACCOMPLISHMENT NARRATIVE");
    const liquidationPdf = await createTestPdf("FINANCIAL LIQUIDATION & RECEIPTS VOUCHER");

    const postEventForm = new FormData();
    postEventForm.append("eventProposalId", String(testProposalId));
    postEventForm.append("organizationId", "helping-hands");
    postEventForm.append("actualAttendance", "125");
    postEventForm.append("totalExpenses", "4850.50");
    postEventForm.append("narrativeFile", new Blob([narrativePdf], { type: "application/pdf" }), "narrative.pdf");
    postEventForm.append("liquidationFile", new Blob([liquidationPdf], { type: "application/pdf" }), "liquidation.pdf");

    const submitReportRes = await fetch(`${BASE_URL}/api/student/post-event-reports`, {
      method: "POST",
      headers: {
        cookie: studentAuth.cookieHeader,
        "x-csrf-token": studentAuth.csrfToken,
      },
      body: postEventForm,
    });
    assert.equal(submitReportRes.status, 201, "Post-event report submission should return 201");
    const submitReportJson = await submitReportRes.json();
    testReportId = submitReportJson.data.id;
    assert.equal(submitReportJson.data.status, "Submitted");
    assert.equal(submitReportJson.data.actual_attendance, 125);
    console.log(`  ✓ Post-event report submitted with ID: ${testReportId}`);

    // Verify student can query pending and submitted reports
    const studentReportsRes = await fetch(`${BASE_URL}/api/student/post-event-reports`, {
      headers: { cookie: studentAuth.cookieHeader },
    });
    assert.equal(studentReportsRes.status, 200);
    const studentReportsJson = await studentReportsRes.json();
    const foundReport = studentReportsJson.data.reports.find((r) => String(r.id) === String(testReportId));
    assert.ok(foundReport, "Submitted report must be in student's report list");
    console.log("  ✓ Student queried submitted post-event report successfully");

    // -------------------------------------------------------------
    // Step 5: OSAS Staff Reviews Post-Event Report
    // -------------------------------------------------------------
    console.log("\n[Step 5] OSAS Staff reviews post-event report and clears organization...");
    // 5a. OSAS queries all post-event reports
    const osasReportsRes = await fetch(`${BASE_URL}/api/osas/post-event-reports`, {
      headers: { cookie: osasAuth.cookieHeader },
    });
    assert.equal(osasReportsRes.status, 200);
    const osasReportsJson = await osasReportsRes.json();
    const foundInOsas = osasReportsJson.data.find((r) => String(r.id) === String(testReportId));
    assert.ok(foundInOsas, "Report must appear in OSAS monitoring list");
    console.log("  ✓ Report confirmed present in OSAS monitoring queue");

    // 5b. Stream Narrative PDF
    const narrativeStreamRes = await fetch(`${BASE_URL}/api/osas/post-event-reports/${testReportId}?file=narrative`, {
      headers: { cookie: osasAuth.cookieHeader },
    });
    assert.equal(narrativeStreamRes.status, 200, "Narrative PDF streaming should return 200");
    assert.equal(narrativeStreamRes.headers.get("content-type"), "application/pdf");
    const narrativeBytes = await narrativeStreamRes.arrayBuffer();
    assert.ok(narrativeBytes.byteLength > 0, "Narrative PDF must have non-zero bytes");
    console.log(`  ✓ Streamed narrative PDF (${narrativeBytes.byteLength} bytes)`);

    // 5c. Stream Liquidation PDF
    const liquidationStreamRes = await fetch(`${BASE_URL}/api/osas/post-event-reports/${testReportId}?file=liquidation`, {
      headers: { cookie: osasAuth.cookieHeader },
    });
    assert.equal(liquidationStreamRes.status, 200, "Liquidation PDF streaming should return 200");
    assert.equal(liquidationStreamRes.headers.get("content-type"), "application/pdf");
    const liquidationBytes = await liquidationStreamRes.arrayBuffer();
    assert.ok(liquidationBytes.byteLength > 0, "Liquidation PDF must have non-zero bytes");
    console.log(`  ✓ Streamed liquidation PDF (${liquidationBytes.byteLength} bytes)`);

    // 5d. OSAS Approves & Clears the Post-Event Report
    const clearReportRes = await fetch(`${BASE_URL}/api/osas/post-event-reports/${testReportId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: osasAuth.cookieHeader,
      },
      body: JSON.stringify({
        status: "Cleared",
        note: "All attendance records and liquidation vouchers validated against guidelines.",
      }),
    });
    assert.equal(clearReportRes.status, 200, "Clearing report should return 200");
    const clearReportJson = await clearReportRes.json();
    assert.equal(clearReportJson.data.status, "Cleared");
    console.log("  ✓ Post-event report updated to 'Cleared'");

    // 5e. Verify linked event proposal post_event_status is also Cleared
    const verifyProposalRes = await fetch(`${BASE_URL}/api/osas/event-proposals/${testProposalId}`, {
      headers: { cookie: osasAuth.cookieHeader },
    });
    assert.equal(verifyProposalRes.status, 200);
    const verifyProposalJson = await verifyProposalRes.json();
    assert.equal(verifyProposalJson.data.post_event_status, "Cleared", "Proposal post_event_status must reflect 'Cleared'");
    console.log("  ✓ Linked event proposal status synchronized to 'Cleared'");

    // -------------------------------------------------------------
    // Step 6: Audit Log Verification
    // -------------------------------------------------------------
    console.log("\n[Step 6] Verifying audit trail logging...");
    const auditRes = await fetch(`${BASE_URL}/api/audit-logs`, {
      headers: { cookie: osasAuth.cookieHeader },
    });
    assert.equal(auditRes.status, 200);
    const auditJson = await auditRes.json();
    const actions = auditJson.data.map((a) => a.action);
    assert.ok(
      actions.some((a) => a.includes("Reviewed OSAS Post-Event Report") || a.includes("Post-Event")),
      "Audit log must record post-event report review"
    );
    console.log("  ✓ Audit trail records verified for post-event clearance");

    console.log("\n=========================================================");
    console.log("🎉 ALL OSAS POST-EVENT WORKFLOW TESTS PASSED!");
    console.log("=========================================================");
  } finally {
    // Cleanup test records
    console.log("\n[Cleanup] Cleaning up test records from database...");
    const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
    if (testReportId) {
      const [report] = await query(
        "DELETE FROM osas_post_event_reports WHERE id = $1 RETURNING narrative_storage_filename, liquidation_storage_filename",
        [testReportId]
      );
      for (const filename of [report?.narrative_storage_filename, report?.liquidation_storage_filename]) {
        if (!filename) continue;
        const filePath = path.join(localDir, "storage", "osas", "uploads", filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
    if (testProposalId) {
      await query("DELETE FROM transaction_updates WHERE event_proposal_id = $1", [testProposalId]);
      const [proposal] = await query(
        "DELETE FROM event_proposals WHERE id = $1 RETURNING storage_filename",
        [testProposalId]
      );
      if (proposal?.storage_filename) {
        const filePath = path.join(localDir, "storage", "osas", "uploads", proposal.storage_filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
    console.log("✓ Test records cleaned up successfully.");
  }
}

runTests().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED:", err);
  process.exit(1);
});

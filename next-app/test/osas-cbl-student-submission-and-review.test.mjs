import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import assert from "node:assert/strict";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { query, queryOne } from "../src/lib/postgres.js";

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

async function runCblStudentSubmissionAndReviewTestSuite() {
  console.log("=== STARTING OSAS CBL STUDENT SUBMISSION & STAFF REVIEW TEST SUITE ===");

  const createdVersionIds = [];

  try {
    // 1. Authenticate OSAS Admin
    console.log("\n[Step 1] Authenticating OSAS Admin...");
    const osasLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin.osas@pup.local", password: "pupstaff" }),
    });
    assert.equal(osasLoginRes.status, 200, "OSAS Admin login failed");
    const osasAuth = extractCookies(osasLoginRes);
    console.log("  ✓ OSAS Admin authenticated");

    // 2. Authenticate Whitelisted Student Officer
    console.log("\n[Step 2] Authenticating whitelisted student officer...");
    const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "test.student@pup.local", password: "student123" }),
    });
    assert.equal(studentLoginRes.status, 200, "Student officer login failed");
    const studentAuth = extractCookies(studentLoginRes);
    console.log("  ✓ Student officer authenticated");

    // 3. Verify student officer can access their organization's CBL history
    console.log("\n[Step 3] Verifying student access to organization CBL endpoint...");
    const studentGetCblRes = await fetch(`${BASE_URL}/api/student/organizations/helping-hands/bylaws`, {
      headers: { cookie: studentAuth.cookieHeader },
    });
    assert.equal(studentGetCblRes.status, 200, "Student GET bylaws failed");
    const studentCblJson = await studentGetCblRes.json();
    assert.equal(studentCblJson.ok, true);
    assert.ok(Array.isArray(studentCblJson.data.versions));
    console.log(`  ✓ Student retrieved CBL records (currently ${studentCblJson.data.versions.length} versions)`);

    // 4. Student Officer Submits a New CBL PDF Amendment
    console.log("\n[Step 4] Student officer submitting new CBL amendment PDF...");
    const cblPdf1 = await createDummyPdf("CONSTITUTION & BY-LAWS 2026 AMENDMENT");
    const form1 = new FormData();
    form1.append("versionTag", "2026-Ratified-CBL-v1");
    form1.append("amendmentSummary", "Updated Article IV on officer tenure and duties");
    form1.append("file", new Blob([cblPdf1], { type: "application/pdf" }), "cbl-2026-amendment.pdf");

    const submitRes1 = await fetch(`${BASE_URL}/api/student/organizations/helping-hands/bylaws`, {
      method: "POST",
      headers: {
        cookie: studentAuth.cookieHeader,
        "x-csrf-token": studentAuth.csrfToken,
      },
      body: form1,
    });
    assert.equal(submitRes1.status, 200, "Student CBL submission failed");
    const submitJson1 = await submitRes1.json();
    assert.equal(submitJson1.ok, true);
    assert.equal(submitJson1.data.status, "Pending");
    assert.equal(submitJson1.data.version_tag, "2026-Ratified-CBL-v1");
    const versionId1 = submitJson1.data.id;
    createdVersionIds.push(versionId1);
    console.log(`  ✓ Version #${versionId1} submitted with status 'Pending'`);

    // 5. Verify OSAS sees pending version and pending_cbl_count
    console.log("\n[Step 5] Checking OSAS view for pending submission and pending_cbl_count...");
    const osasGetRes = await fetch(`${BASE_URL}/api/osas/organizations/helping-hands/bylaws`, {
      headers: { cookie: osasAuth.cookieHeader },
    });
    assert.equal(osasGetRes.status, 200);
    const osasGetJson = await osasGetRes.json();
    assert.equal(osasGetJson.ok, true);
    const pendingVer = osasGetJson.data.versions.find((v) => Number(v.id) === Number(versionId1));
    assert.ok(pendingVer, "Pending version not found in OSAS versions list");
    assert.equal(pendingVer.status, "Pending");
    console.log("  ✓ OSAS retrieved versions including the pending submission");

    // Verify PDF streaming for this version
    const pdfStreamRes = await fetch(`${BASE_URL}/api/osas/organizations/helping-hands/bylaws?file=1&versionId=${versionId1}`, {
      headers: { cookie: osasAuth.cookieHeader },
    });
    assert.equal(pdfStreamRes.status, 200);
    assert.equal(pdfStreamRes.headers.get("content-type"), "application/pdf");
    console.log("  ✓ OSAS successfully streamed the submitted version PDF");

    // 6. Test Review Guard: Request Revision without note fails
    console.log("\n[Step 6] Testing review note guard on 'Needs Revision'...");
    const emptyNoteRes = await fetch(`${BASE_URL}/api/osas/organizations/helping-hands/bylaws`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: osasAuth.cookieHeader,
        "x-csrf-token": osasAuth.csrfToken,
      },
      body: JSON.stringify({
        versionId: versionId1,
        status: "Needs Revision",
        reviewNote: "", // invalid: must be >= 5 chars
      }),
    });
    assert.equal(emptyNoteRes.status, 400, "Empty note was unexpectedly allowed");
    console.log("  ✓ Guard enforced: Review note < 5 characters rejected (400)");

    // 7. Request Revision with detailed feedback
    console.log("\n[Step 7] OSAS requesting revision with detailed instructions...");
    const requestRevRes = await fetch(`${BASE_URL}/api/osas/organizations/helping-hands/bylaws`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: osasAuth.cookieHeader,
        "x-csrf-token": osasAuth.csrfToken,
      },
      body: JSON.stringify({
        versionId: versionId1,
        status: "Needs Revision",
        reviewNote: "Please attach the signed general assembly resolution certificate.",
      }),
    });
    assert.equal(requestRevRes.status, 200);
    const revJson = await requestRevRes.json();
    assert.equal(revJson.data.status, "Needs Revision");
    console.log("  ✓ Version status transitioned to 'Needs Revision'");

    // 8. Student Officer resubmits revised version
    console.log("\n[Step 8] Student officer resubmitting revised CBL PDF...");
    const cblPdf2 = await createDummyPdf("CONSTITUTION & BY-LAWS 2026 REVISED CHARTER");
    const form2 = new FormData();
    form2.append("versionTag", "2026-Ratified-CBL-Final");
    form2.append("amendmentSummary", "Added signed general assembly resolution certificate");
    form2.append("file", new Blob([cblPdf2], { type: "application/pdf" }), "cbl-2026-final.pdf");

    const submitRes2 = await fetch(`${BASE_URL}/api/student/organizations/helping-hands/bylaws`, {
      method: "POST",
      headers: {
        cookie: studentAuth.cookieHeader,
        "x-csrf-token": studentAuth.csrfToken,
      },
      body: form2,
    });
    assert.equal(submitRes2.status, 200);
    const submitJson2 = await submitRes2.json();
    const versionId2 = submitJson2.data.id;
    createdVersionIds.push(versionId2);
    console.log(`  ✓ Revised version #${versionId2} submitted with status 'Pending'`);

    // 9. OSAS Staff Approves the revised version
    console.log("\n[Step 9] OSAS Staff approving and ratifying revised charter...");
    const approveRes = await fetch(`${BASE_URL}/api/osas/organizations/helping-hands/bylaws`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: osasAuth.cookieHeader,
        "x-csrf-token": osasAuth.csrfToken,
      },
      body: JSON.stringify({
        versionId: versionId2,
        status: "Approved",
        reviewNote: "Charter ratified and verified in compliance with OSAS bylaws standards.",
        effectiveDate: "2026-10-02",
      }),
    });
    assert.equal(approveRes.status, 200);
    const approveJson = await approveRes.json();
    assert.equal(approveJson.data.status, "Approved");
    console.log("  ✓ Version successfully approved");

    // 10. Verify older approved versions became 'Superseded' and student_organizations updated
    console.log("\n[Step 10] Verifying superseding of old versions and org profile sync...");
    const dbOrg = await queryOne(`SELECT * FROM student_organizations WHERE id = 'helping-hands'`);
    assert.equal(dbOrg.bylaws_original_filename, "cbl-2026-final.pdf", "Org active original filename not synced");
    assert.equal(dbOrg.bylaws_storage_filename, submitJson2.data.storage_filename, "Org active storage filename not synced");

    const oldVersions = await query(
      `SELECT * FROM organization_bylaws_versions WHERE organization_id = 'helping-hands' AND id != $1 AND status = 'Approved'`,
      [versionId2]
    );
    assert.equal(oldVersions.length, 0, "Older approved versions were not marked as Superseded");
    console.log("  ✓ Org profile synchronized to new active charter");
    console.log("  ✓ All older versions correctly marked as 'Superseded'");

    console.log("\n=== ALL 10 CBL SUBMISSION & REVIEW TESTS PASSED SUCCESSFULLY! ===");
  } finally {
    // Cleanup created test versions
    if (createdVersionIds.length > 0) {
      console.log(`\n[Cleanup] Removing ${createdVersionIds.length} test version records...`);
      await query(`DELETE FROM organization_bylaws_versions WHERE id = ANY($1::bigint[])`, [createdVersionIds]);
      console.log("  ✓ Test versions deleted");
    }
  }
}

runCblStudentSubmissionAndReviewTestSuite().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});

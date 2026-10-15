import assert from "node:assert/strict";
import crypto from "node:crypto";
import { query, queryOne } from "../src/lib/postgres.js";
import { signSessionToken } from "../src/lib/jwt.js";
import { registerSessionToken } from "../src/lib/authSessions.js";
import { generateCSRFToken } from "../src/lib/csrfProtection.js";
import { createDocument, findDuplicateActiveDocument, replaceDocumentFile } from "../src/lib/documentsRepo.js";

async function run() {
  console.log("=== STARTING DUPLICATE DOCUMENT TYPE VALIDATION TEST ===");

  // 1. Prepare Auth Tokens for Registrar & OSAS Staff
  const regJti = crypto.randomUUID();
  const regPayload = {
    sub: "PUPREGISTRAR-002",
    role: "Staff",
    username: "staff.registrar@pup.local",
    officeId: "registrar",
    office_id: "registrar",
    jti: regJti,
    purpose: "access",
  };
  const regToken = await signSessionToken(regPayload);
  await registerSessionToken(regToken);
  const regCsrf = generateCSRFToken(regJti);

  const osasJti = crypto.randomUUID();
  const osasPayload = {
    sub: "PUPOSAS-001",
    role: "Admin",
    username: "admin.osas@pup.local",
    officeId: "osas",
    office_id: "osas",
    jti: osasJti,
    purpose: "access",
  };
  const osasToken = await signSessionToken(osasPayload);
  await registerSessionToken(osasToken);
  const osasCsrf = generateCSRFToken(osasJti);

  // Pick or create a test student in Registrar
  const testStudentNo = "2026-DUP01-SJ-0";
  await query(`DELETE FROM documents WHERE student_no = $1`, [testStudentNo]);
  await query(`DELETE FROM student_office_memberships WHERE student_no = $1`, [testStudentNo]);
  await query(`DELETE FROM students WHERE student_no = $1`, [testStudentNo]);

  await query(
    `INSERT INTO students (student_no, name, course_code, year_level, section, storage_room, storage_cabinet, storage_drawer, status)
     VALUES ($1, 'Duplicate Test Student', 'BSIT', 2026, '1', 1, '2020', 1, 'Active')`,
    [testStudentNo]
  );
  await query(
    `INSERT INTO student_office_memberships (student_no, office_id, status)
     VALUES ($1, 'registrar', 'Active')`,
    [testStudentNo]
  );

  try {
    // --- Test 1: Uploading a new document type succeeds with 201 ---
    console.log("\n[Test 1] Uploading new document type 'Transcript of Records'...");
    const form1 = new FormData();
    form1.append("file", new Blob(["%PDF-1.4 first copy"], { type: "application/pdf" }), "tor_original.pdf");
    form1.append("studentNo", testStudentNo);
    form1.append("docType", "Transcript of Records");

    const res1 = await fetch("http://localhost:3000/api/documents", {
      method: "POST",
      headers: {
        cookie: `pup_session=${regToken}`,
        "x-csrf-token": regCsrf,
      },
      body: form1,
    });
    const data1 = await res1.json();
    assert.equal(res1.status, 201, `Expected 201 Created, got ${res1.status}`);
    assert.equal(data1.ok, true);
    assert.equal(data1.data.student_no, testStudentNo);
    assert.equal(data1.data.doc_type, "Transcript of Records");
    assert.equal(data1.data.approval_status, "Pending");
    const doc1Id = data1.data.id;
    console.log(`✓ First upload succeeded (Doc ID: ${doc1Id}, Status: Pending).`);

    // --- Test 2: Uploading duplicate docType for same student is rejected with 409 Conflict ---
    console.log("\n[Test 2] Uploading duplicate docType while first is 'Pending'...");
    const form2 = new FormData();
    form2.append("file", new Blob(["%PDF-1.4 duplicate copy"], { type: "application/pdf" }), "tor_dup.pdf");
    form2.append("studentNo", testStudentNo);
    form2.append("docType", "Transcript of Records");

    const res2 = await fetch("http://localhost:3000/api/documents", {
      method: "POST",
      headers: {
        cookie: `pup_session=${regToken}`,
        "x-csrf-token": regCsrf,
      },
      body: form2,
    });
    const data2 = await res2.json();
    assert.equal(res2.status, 409, `Expected 409 Conflict, got ${res2.status}`);
    assert.equal(data2.ok, false);
    assert.equal(data2.isDuplicate, true);
    assert.equal(data2.duplicateId, doc1Id);
    assert.equal(data2.existingStatus, "Pending");
    assert.match(data2.error, /already registered/i);
    assert.match(data2.error, /single digital twin/i);
    console.log(`✓ Duplicate upload correctly rejected with 409 Conflict: "${data2.error}"`);

    // --- Test 3: Uploading duplicate when first is 'Approved' is also rejected with 409 Conflict ---
    console.log("\n[Test 3] Uploading duplicate docType when first is 'Approved'...");
    await query(`UPDATE documents SET approval_status = 'Approved' WHERE id = $1`, [doc1Id]);

    const form3 = new FormData();
    form3.append("file", new Blob(["%PDF-1.4 duplicate approved copy"], { type: "application/pdf" }), "tor_dup2.pdf");
    form3.append("studentNo", testStudentNo);
    form3.append("docType", "Transcript of Records");

    const res3 = await fetch("http://localhost:3000/api/documents", {
      method: "POST",
      headers: {
        cookie: `pup_session=${regToken}`,
        "x-csrf-token": regCsrf,
      },
      body: form3,
    });
    const data3 = await res3.json();
    assert.equal(res3.status, 409, `Expected 409 Conflict, got ${res3.status}`);
    assert.equal(data3.ok, false);
    assert.equal(data3.isDuplicate, true);
    assert.equal(data3.duplicateId, doc1Id);
    assert.equal(data3.existingStatus, "Approved");
    assert.match(data3.error, /Approved/i);
    console.log(`✓ Duplicate upload against Approved document correctly rejected with 409 Conflict.`);

    // --- Test 4: Uploading with allowOverwrite: true replaces in-place without duplicate rows ---
    console.log("\n[Test 4] Uploading with allowOverwrite: true replaces in-place...");
    const form4 = new FormData();
    form4.append("file", new Blob(["%PDF-1.4 overwritten replacement copy"], { type: "application/pdf" }), "tor_replaced.pdf");
    form4.append("studentNo", testStudentNo);
    form4.append("docType", "Transcript of Records");
    form4.append("allowOverwrite", "true");

    const res4 = await fetch("http://localhost:3000/api/documents", {
      method: "POST",
      headers: {
        cookie: `pup_session=${regToken}`,
        "x-csrf-token": regCsrf,
      },
      body: form4,
    });
    const data4 = await res4.json();
    assert.equal(res4.status, 201, `Expected 201, got ${res4.status}`);
    assert.equal(data4.ok, true);
    assert.equal(data4.data.id, doc1Id, "Must reuse existing document ID instead of creating new row");
    assert.equal(data4.data.original_filename, "tor_replaced.pdf");
    assert.equal(data4.data.approval_status, "Pending", "Status must reset to Pending upon file replacement");

    const dbDocsCount = await queryOne(
      `SELECT count(*)::int as cnt FROM documents WHERE student_no = $1 AND doc_type = 'Transcript of Records'`,
      [testStudentNo]
    );
    assert.equal(dbDocsCount.cnt, 1, "There must still be exactly 1 row in the database");
    console.log(`✓ allowOverwrite successfully updated document #${doc1Id} in-place with exactly 1 row preserved.`);

    // --- Test 5: Different document type for same student is allowed ---
    console.log("\n[Test 5] Uploading different docType 'Good Moral Certificate' for same student...");
    const form5 = new FormData();
    form5.append("file", new Blob(["%PDF-1.4 good moral copy"], { type: "application/pdf" }), "good_moral.pdf");
    form5.append("studentNo", testStudentNo);
    form5.append("docType", "Good Moral Certificate");

    const res5 = await fetch("http://localhost:3000/api/documents", {
      method: "POST",
      headers: {
        cookie: `pup_session=${regToken}`,
        "x-csrf-token": regCsrf,
      },
      body: form5,
    });
    const data5 = await res5.json();
    assert.equal(res5.status, 201);
    assert.equal(data5.ok, true);
    assert.notEqual(data5.data.id, doc1Id);
    console.log(`✓ Different document type permitted (Doc ID: ${data5.data.id}).`);

    // --- Test 6: Re-uploading after document is 'Declined' is permitted ---
    console.log("\n[Test 6] Re-uploading document type after previous copy was 'Declined'...");
    await query(`UPDATE documents SET approval_status = 'Declined' WHERE id = $1`, [doc1Id]);

    const form6 = new FormData();
    form6.append("file", new Blob(["%PDF-1.4 reupload after decline"], { type: "application/pdf" }), "tor_fresh_scan.pdf");
    form6.append("studentNo", testStudentNo);
    form6.append("docType", "Transcript of Records");

    const res6 = await fetch("http://localhost:3000/api/documents", {
      method: "POST",
      headers: {
        cookie: `pup_session=${regToken}`,
        "x-csrf-token": regCsrf,
      },
      body: form6,
    });
    const data6 = await res6.json();
    assert.equal(res6.status, 201, `Expected 201 after decline, got ${res6.status}`);
    assert.equal(data6.ok, true);
    assert.notEqual(data6.data.id, doc1Id, "Should create new active row after previous is declined");
    assert.equal(data6.data.approval_status, "Pending");
    console.log(`✓ Re-uploading after document decline succeeded (New Doc ID: ${data6.data.id}).`);

    // --- Test 7: OSAS polymorphic organization duplicate validation ---
    console.log("\n[Test 7] OSAS polymorphic student organization duplicate validation...");
    const testOrgId = "test-dup-org";
    await query(`DELETE FROM documents WHERE organization_id = $1`, [testOrgId]);
    await query(`DELETE FROM student_organizations WHERE id = $1`, [testOrgId]);

    await query(
      `INSERT INTO student_organizations (id, name, acronym, category, storage_room, storage_cabinet, storage_drawer)
       VALUES ($1, 'Test Duplicate Org', 'TDO', 'Academic', 1, 'ACADEMIC ORGANIZATIONS', '1')`,
      [testOrgId]
    );

    const formOrg1 = new FormData();
    formOrg1.append("file", new Blob(["%PDF-1.4 org doc original"], { type: "application/pdf" }), "org_cert.pdf");
    formOrg1.append("organizationId", testOrgId);
    formOrg1.append("docType", "Organization Registration Certificate");

    const resOrg1 = await fetch("http://localhost:3000/api/documents", {
      method: "POST",
      headers: {
        cookie: `pup_session=${osasToken}`,
        "x-csrf-token": osasCsrf,
      },
      body: formOrg1,
    });
    const dataOrg1 = await resOrg1.json();
    assert.equal(resOrg1.status, 201);
    const orgDoc1Id = dataOrg1.data.id;

    // Attempt duplicate for OSAS org
    const formOrg2 = new FormData();
    formOrg2.append("file", new Blob(["%PDF-1.4 org doc dup"], { type: "application/pdf" }), "org_cert_dup.pdf");
    formOrg2.append("organizationId", testOrgId);
    formOrg2.append("docType", "Organization Registration Certificate");

    const resOrg2 = await fetch("http://localhost:3000/api/documents", {
      method: "POST",
      headers: {
        cookie: `pup_session=${osasToken}`,
        "x-csrf-token": osasCsrf,
      },
      body: formOrg2,
    });
    const dataOrg2 = await resOrg2.json();
    assert.equal(resOrg2.status, 409, `Expected 409 for OSAS duplicate, got ${resOrg2.status}`);
    assert.equal(dataOrg2.isDuplicate, true);
    assert.equal(dataOrg2.duplicateId, orgDoc1Id);
    assert.match(dataOrg2.error, /organization/i);
    console.log(`✓ OSAS student organization duplicate upload correctly rejected with 409 Conflict.`);

    // OSAS overwrite
    const formOrg3 = new FormData();
    formOrg3.append("file", new Blob(["%PDF-1.4 org doc replacement"], { type: "application/pdf" }), "org_cert_rep.pdf");
    formOrg3.append("organizationId", testOrgId);
    formOrg3.append("docType", "Organization Registration Certificate");
    formOrg3.append("allowOverwrite", "true");

    const resOrg3 = await fetch("http://localhost:3000/api/documents", {
      method: "POST",
      headers: {
        cookie: `pup_session=${osasToken}`,
        "x-csrf-token": osasCsrf,
      },
      body: formOrg3,
    });
    const dataOrg3 = await resOrg3.json();
    assert.equal(resOrg3.status, 201);
    assert.equal(dataOrg3.data.id, orgDoc1Id, "Must reuse existing OSAS document ID");
    console.log(`✓ OSAS allowOverwrite successfully replaced organization document in-place.`);

    console.log("\n=== ALL DUPLICATE DOCUMENT VALIDATION TESTS PASSED! ===");
  } finally {
    // Cleanup
    await query(`DELETE FROM documents WHERE student_no = $1`, [testStudentNo]);
    await query(`DELETE FROM student_office_memberships WHERE student_no = $1`, [testStudentNo]);
    await query(`DELETE FROM students WHERE student_no = $1`, [testStudentNo]);
    await query(`DELETE FROM documents WHERE organization_id = 'test-dup-org'`);
    await query(`DELETE FROM student_organizations WHERE id = 'test-dup-org'`);
  }
}

run().catch((err) => {
  console.error("\n❌ Test failed with error:", err);
  process.exit(1);
});

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { query, queryOne } from "../src/lib/postgres.js";
import { signSessionToken } from "../src/lib/jwt.js";
import { registerSessionToken } from "../src/lib/authSessions.js";
import { generateCSRFToken } from "../src/lib/csrfProtection.js";
import { getStorageLayout } from "../src/lib/storageLayoutRepo.js";
import { listStudentLocationUsage } from "../src/lib/studentsRepo.js";
import { createDocument } from "../src/lib/documentsRepo.js";

async function run() {
  console.log("=== STARTING STORAGE INTEGRITY & API RESILIENCE TEST ===");

  // 1. Prepare Auth Tokens
  const staffJti = crypto.randomUUID();
  const staffPayload = {
    sub: "PUPREGISTRAR-002",
    role: "Staff",
    username: "staff.registrar@pup.local",
    officeId: "registrar",
    office_id: "registrar",
    jti: staffJti,
    purpose: "access",
  };
  const staffToken = await signSessionToken(staffPayload);
  await registerSessionToken(staffToken);
  const staffCsrf = generateCSRFToken(staffJti);

  const adminJti = crypto.randomUUID();
  const adminPayload = {
    sub: "PUPREGISTRAR-003",
    role: "Admin",
    username: "admin.registrar@pup.local",
    officeId: "registrar",
    office_id: "registrar",
    jti: adminJti,
    purpose: "access",
  };
  const adminToken = await signSessionToken(adminPayload);
  await registerSessionToken(adminToken);
  const adminCsrf = generateCSRFToken(adminJti);

  // --- Test 1: POST /api/documents rejects invalid cabinet for new student ---
  console.log("\n[Test 1] Testing POST /api/documents with non-existent cabinet for new student...");
  const formDataBadCab = new FormData();
  formDataBadCab.append("file", new Blob(["%PDF-1.4 mock pdf"], { type: "application/pdf" }), "test-bad-cab.pdf");
  formDataBadCab.append("studentNo", "2026-99991-TG-0");
  formDataBadCab.append("studentName", "Test Phantom Student");
  formDataBadCab.append("docType", "Transcript of Records");
  formDataBadCab.append("isNewStudent", "true");
  formDataBadCab.append("courseCode", "BSIT");
  formDataBadCab.append("yearLevel", "2026");
  formDataBadCab.append("section", "1");
  formDataBadCab.append("room", "1");
  formDataBadCab.append("cabinet", "CAB-NONEXISTENT");
  formDataBadCab.append("drawer", "1");

  const resBadCab = await fetch("http://localhost:3000/api/documents", {
    method: "POST",
    headers: {
      cookie: `pup_session=${staffToken}`,
      "x-csrf-token": staffCsrf,
    },
    body: formDataBadCab,
  });
  const dataBadCab = await resBadCab.json();
  assert.equal(resBadCab.status, 400, `Expected 400 for bad cabinet, got ${resBadCab.status}`);
  assert.equal(dataBadCab.ok, false);
  assert.ok(dataBadCab.error.includes("does not exist"), `Expected error about non-existent cabinet, got: ${dataBadCab.error}`);
  console.log("✓ POST /api/documents successfully rejected invalid cabinet with HTTP 400:", dataBadCab.error);

  // --- Test 2: POST /api/documents returns clean 400 (not 500) on unassigned student ---
  console.log("\n[Test 2] Testing POST /api/documents error handling for non-existent student (no 500)...");
  const formDataUnassigned = new FormData();
  formDataUnassigned.append("file", new Blob(["%PDF-1.4 mock pdf"], { type: "application/pdf" }), "test-unassigned.pdf");
  formDataUnassigned.append("studentNo", "2026-00000-XX-0");
  formDataUnassigned.append("docType", "Transcript of Records");
  formDataUnassigned.append("isNewStudent", "false");

  const resUnassigned = await fetch("http://localhost:3000/api/documents", {
    method: "POST",
    headers: {
      cookie: `pup_session=${staffToken}`,
      "x-csrf-token": staffCsrf,
    },
    body: formDataUnassigned,
  });
  const dataUnassigned = await resUnassigned.json();
  assert.equal(resUnassigned.status, 400, `Expected 400 (not 500) for unassigned student, got ${resUnassigned.status}`);
  assert.equal(dataUnassigned.ok, false);
  assert.ok(dataUnassigned.error.includes("not assigned to this office"), `Expected error about unassigned student, got: ${dataUnassigned.error}`);
  console.log("✓ POST /api/documents returned clean HTTP 400 instead of 500 crash:", dataUnassigned.error);

  // --- Test 3: listStudentLocationUsage counts archived students ---
  console.log("\n[Test 3] Testing listStudentLocationUsage includes archived students...");
  const testStudentNoArchived = "2026-77771-TG-0";
  await query(`DELETE FROM student_office_memberships WHERE student_no = $1`, [testStudentNoArchived]);
  await query(`DELETE FROM students WHERE student_no = $1`, [testStudentNoArchived]);

  const existingSection = await queryOne(`SELECT name, course_code FROM sections WHERE course_code = 'BSIT' LIMIT 1`);
  const secName = existingSection?.name || "1";

  await query(`
    INSERT INTO students (student_no, name, course_code, year_level, section, status, storage_room, storage_cabinet, storage_drawer)
    VALUES ($1, 'Archived Test Record', 'BSIT', 2026, $2, 'Archived', 1, 'A', 1)
  `, [testStudentNoArchived, secName]);
  await query(`
    INSERT INTO student_office_memberships (student_no, office_id, status)
    VALUES ($1, 'registrar', 'Active')
  `, [testStudentNoArchived]);

  const usage = await listStudentLocationUsage({ officeId: "registrar" });
  const locA1 = usage.find((u) => Number(u.room) === 1 && String(u.cabinet).toUpperCase() === "A" && Number(u.drawer) === 1);
  assert.ok(locA1, "Expected location Room 1 / Cabinet A / Drawer 1 to be found in usage");
  assert.ok(Number(locA1.count) >= 1, `Expected count >= 1, got ${locA1.count}`);
  assert.ok(Number(locA1.archived_count) >= 1, `Expected archived_count >= 1, got ${locA1.archived_count}`);
  console.log(`✓ listStudentLocationUsage counted ${locA1.count} total records (${locA1.active_count} active, ${locA1.archived_count} archived).`);

  // --- Test 4: PUT /api/storage-layout blocks deleting cabinets with archived students ---
  console.log("\n[Test 4] Testing PUT /api/storage-layout blocks deleting cabinet containing archived student...");
  const currentLayout = await getStorageLayout({ officeId: "registrar" });
  const proposedRooms = currentLayout.rooms.map((r) => {
    if (r.id === 1) {
      return {
        ...r,
        cabinets: r.cabinets.filter((c) => c.id !== "2020" && c.id !== "A"),
      };
    }
    return r;
  });

  const resLayout = await fetch("http://localhost:3000/api/storage-layout?officeId=registrar", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      cookie: `pup_session=${adminToken}`,
      "x-csrf-token": adminCsrf,
    },
    body: JSON.stringify({ rooms: proposedRooms }),
  });
  const dataLayout = await resLayout.json();
  assert.equal(resLayout.status, 400, `Expected 400 when attempting to remove occupied cabinet, got ${resLayout.status}`);
  assert.equal(dataLayout.ok, false);
  assert.ok(dataLayout.error.includes("Cannot remove layout locations with existing physical records"), `Expected error about existing physical records, got: ${dataLayout.error}`);
  assert.ok(dataLayout.error.includes("Cabinet 2020") || dataLayout.error.includes("Cabinet A"), `Expected error to mention cabinet, got: ${dataLayout.error}`);
  console.log("✓ PUT /api/storage-layout blocked cabinet removal with physical records:", dataLayout.error);

  // --- Test 5: PATCH /api/students/[studentNo] blocks restore if location is obsolete ---
  console.log("\n[Test 5] Testing restore blocked when assigned location does not exist in layout...");
  await query(`UPDATE students SET storage_cabinet = 'CAB-OBSOLETE' WHERE student_no = $1`, [testStudentNoArchived]);

  const resRestoreObsolete = await fetch(`http://localhost:3000/api/students/${testStudentNoArchived}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: `pup_session=${staffToken}`,
      "x-csrf-token": staffCsrf,
    },
    body: JSON.stringify({ status: "Active" }),
  });
  const dataRestoreObsolete = await resRestoreObsolete.json();
  assert.equal(resRestoreObsolete.status, 400, `Expected 400 when restoring to obsolete location, got ${resRestoreObsolete.status}`);
  assert.equal(dataRestoreObsolete.ok, false);
  assert.ok(dataRestoreObsolete.error.includes("no longer exists in the storage layout"), `Expected layout error, got: ${dataRestoreObsolete.error}`);
  console.log("✓ PATCH /api/students/[studentNo] blocked restore into obsolete location:", dataRestoreObsolete.error);

  // Reset student cabinet back to valid location
  await query(`UPDATE students SET storage_cabinet = 'A' WHERE student_no = $1`, [testStudentNoArchived]);

  // Now restore should succeed
  const resRestoreValid = await fetch(`http://localhost:3000/api/students/${testStudentNoArchived}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: `pup_session=${staffToken}`,
      "x-csrf-token": staffCsrf,
    },
    body: JSON.stringify({ status: "Active" }),
  });
  const dataRestoreValid = await resRestoreValid.json();
  assert.equal(resRestoreValid.status, 200, `Expected 200 when restoring to valid location, got ${resRestoreValid.status}`);
  assert.equal(dataRestoreValid.ok, true);
  assert.equal(dataRestoreValid.data.status, "Active");
  console.log("✓ PATCH /api/students/[studentNo] succeeded restoring student with valid location.");

  // --- Test 6: POST /api/document-requests auto-links only Approved documents ---
  console.log("\n[Test 6] Testing POST /api/document-requests auto-links only Approved documents...");
  await query(`DELETE FROM document_requests WHERE student_no = $1`, [testStudentNoArchived]);
  await query(`DELETE FROM documents WHERE student_no = $1`, [testStudentNoArchived]);

  // Create a Pending document
  const pendingDoc = await createDocument({
    officeId: "registrar",
    studentNo: testStudentNoArchived,
    studentName: "Archived Test Record",
    docType: "Transcript of Records",
    originalFilename: "tor_pending.pdf",
    mimeType: "application/pdf",
    sizeBytes: 100,
    buffer: Buffer.from("%PDF-1.4 pending tor"),
    uploadedBy: "PUPREGISTRAR-002",
  });
  assert.equal(pendingDoc.approval_status, "Pending");

  // Create document request - should NOT link to pending document
  const resReq1 = await fetch("http://localhost:3000/api/document-requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `pup_session=${staffToken}`,
      "x-csrf-token": staffCsrf,
    },
    body: JSON.stringify({
      studentNo: testStudentNoArchived,
      docType: "Transcript of Records",
      clientType: "Student",
    }),
  });
  const dataReq1 = await resReq1.json();
  assert.equal(resReq1.status, 201);
  assert.equal(dataReq1.ok, true);
  assert.equal(dataReq1.data.linked_document_id, null, "Pending document must NOT be auto-linked to request");
  console.log("✓ Request did not auto-link pending document (linked_document_id is null).");

  // Now create an Approved document
  const approvedDoc = await createDocument({
    officeId: "registrar",
    studentNo: testStudentNoArchived,
    studentName: "Archived Test Record",
    docType: "Transcript of Records",
    originalFilename: "tor_approved.pdf",
    mimeType: "application/pdf",
    sizeBytes: 100,
    buffer: Buffer.from("%PDF-1.4 approved tor"),
    uploadedBy: "PUPREGISTRAR-002",
    allowOverwrite: true,
  });
  await query(`UPDATE documents SET approval_status = 'Approved', reviewed_at = CURRENT_TIMESTAMP WHERE id = $1`, [approvedDoc.id]);

  // Create document request again - should link to approved document!
  const resReq2 = await fetch("http://localhost:3000/api/document-requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `pup_session=${staffToken}`,
      "x-csrf-token": staffCsrf,
    },
    body: JSON.stringify({
      studentNo: testStudentNoArchived,
      docType: "Transcript of Records",
      clientType: "Student",
    }),
  });
  const dataReq2 = await resReq2.json();
  assert.equal(resReq2.status, 201);
  assert.equal(dataReq2.ok, true);
  assert.equal(dataReq2.data.linked_document_id, approvedDoc.id, "Approved document MUST be auto-linked to request");
  console.log(`✓ Request successfully auto-linked approved document (linked_document_id = ${approvedDoc.id}).`);

  // Cleanup test data
  await query(`DELETE FROM document_requests WHERE student_no = $1`, [testStudentNoArchived]);
  await query(`DELETE FROM documents WHERE student_no = $1`, [testStudentNoArchived]);
  await query(`DELETE FROM student_office_memberships WHERE student_no = $1`, [testStudentNoArchived]);
  await query(`DELETE FROM students WHERE student_no = $1`, [testStudentNoArchived]);

  console.log("\n=== ALL STORAGE INTEGRITY & API RESILIENCE TESTS PASSED! ===");
}

run().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});

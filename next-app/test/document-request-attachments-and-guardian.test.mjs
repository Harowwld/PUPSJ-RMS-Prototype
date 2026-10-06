import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { query, queryOne } = await import("../src/lib/postgres.js");
const {
  createDocumentRequest,
  getDocumentRequestById,
  listDocumentRequests,
  addRequestAttachment,
  getRequestAttachments,
  getRequestAttachmentById,
  updateSpaVerification,
} = await import("../src/lib/documentRequestsRepo.js");

test("Document Request Attachments & Parent/Guardian SPA Workflow Suite", async (t) => {
  let testStudent = null;
  let testStaff = null;
  let createdParentReq = null;
  let createdStudentReq = null;

  t.before(async () => {
    testStudent = await queryOne(
      "SELECT student_no, name, course_code FROM students WHERE status = 'Active' LIMIT 1"
    );
    assert.ok(testStudent, "An active student record must exist in the database");

    testStaff = await queryOne(
      "SELECT id, fname, lname FROM staff WHERE status = 'Active' LIMIT 1"
    );
    assert.ok(testStaff, "An active staff record must exist in the database");
  });

  t.after(async () => {
    const ids = [createdParentReq?.id, createdStudentReq?.id].filter(Boolean);
    if (ids.length > 0) {
      await query("DELETE FROM transaction_updates WHERE document_request_id = ANY($1::bigint[])", [ids]);
      await query("DELETE FROM document_request_attachments WHERE document_request_id = ANY($1::bigint[])", [ids]);
      await query("DELETE FROM document_requests WHERE id = ANY($1::bigint[])", [ids]);
    }
  });

  await t.test("1. Database Schema: Tables and columns exist with proper constraints", async () => {
    // Check document_request_attachments table columns
    const attachmentCols = await query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'document_request_attachments'
       ORDER BY ordinal_position`
    );
    const colNames = attachmentCols.map((c) => c.column_name);

    assert.ok(colNames.includes("id"), "Should have id column");
    assert.ok(colNames.includes("document_request_id"), "Should have document_request_id column");
    assert.ok(colNames.includes("original_filename"), "Should have original_filename column");
    assert.ok(colNames.includes("storage_filename"), "Should have storage_filename column");
    assert.ok(colNames.includes("mime_type"), "Should have mime_type column");
    assert.ok(colNames.includes("size_bytes"), "Should have size_bytes column");
    assert.ok(colNames.includes("attachment_type"), "Should have attachment_type column");

    // Check document_requests new columns
    const requestCols = await query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'document_requests'`
    );
    const reqColNames = requestCols.map((c) => c.column_name);

    assert.ok(reqColNames.includes("requester_relationship"), "Should have requester_relationship column");
    assert.ok(reqColNames.includes("requester_contact"), "Should have requester_contact column");
    assert.ok(reqColNames.includes("spa_verified"), "Should have spa_verified column");
    assert.ok(reqColNames.includes("spa_verified_by"), "Should have spa_verified_by column");
    assert.ok(reqColNames.includes("spa_verified_at"), "Should have spa_verified_at column");
  });

  await t.test("2. Parent/Guardian Persona: Creates request with guardian metadata", async () => {
    createdParentReq = await createDocumentRequest({
      officeId: "registrar",
      studentNo: testStudent.student_no,
      docType: "Transcript of Records",
      notes: "Request submitted by mother on behalf of student",
      clientType: "Parent",
      requesterName: "Maria Santos (Mother)",
      requesterRelationship: "Mother",
      requesterContact: "+63 917 123 4567",
      createdBy: testStaff.id,
    });

    assert.ok(createdParentReq?.id, "Parent document request should be created");
    assert.equal(createdParentReq.client_type, "Parent");
    assert.equal(createdParentReq.requester_relationship, "Mother");
    assert.equal(createdParentReq.requester_contact, "+63 917 123 4567");
    assert.equal(createdParentReq.spa_verified, false, "SPA should default to unverified");
  });

  await t.test("3. Attachment Operations: Insert and fetch attachments with type classifications", async () => {
    // 1. Add Special Power of Attorney
    const att1 = await addRequestAttachment({
      documentRequestId: createdParentReq.id,
      originalFilename: "notarized_spa_santos.pdf",
      storageFilename: "test-uuid-spa-001.pdf",
      mimeType: "application/pdf",
      sizeBytes: 154200,
      attachmentType: "spa",
      uploadedBy: "student_portal",
    });
    assert.ok(att1?.id, "Attachment 1 (SPA) should be created");
    assert.equal(att1.attachment_type, "spa");
    assert.equal(att1.original_filename, "notarized_spa_santos.pdf");

    // 2. Add Parent Valid Government ID
    const att2 = await addRequestAttachment({
      documentRequestId: createdParentReq.id,
      originalFilename: "passport_mother_id.jpg",
      storageFilename: "test-uuid-id-002.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 89000,
      attachmentType: "valid_id",
      uploadedBy: "student_portal",
    });
    assert.ok(att2?.id, "Attachment 2 (Valid ID) should be created");
    assert.equal(att2.attachment_type, "valid_id");

    // 3. Add Proof of Payment / Receipt
    const att3 = await addRequestAttachment({
      documentRequestId: createdParentReq.id,
      originalFilename: "landbank_payment_receipt.png",
      storageFilename: "test-uuid-rcpt-003.png",
      mimeType: "image/png",
      sizeBytes: 42100,
      attachmentType: "receipt",
      uploadedBy: "student_portal",
    });
    assert.ok(att3?.id, "Attachment 3 (Receipt) should be created");

    // Fetch all attachments for request
    const attachments = await getRequestAttachments(createdParentReq.id);
    assert.equal(attachments.length, 3, "Request should have 3 attachments");

    // Fetch single attachment by ID
    const single = await getRequestAttachmentById(att1.id);
    assert.ok(single);
    assert.equal(single.original_filename, "notarized_spa_santos.pdf");

    // Fetch request with hydrated attachments
    const hydrated = await getDocumentRequestById(createdParentReq.id, { officeId: "registrar" });
    assert.ok(Array.isArray(hydrated.attachments), "Hydrated request should have attachments array");
    assert.equal(hydrated.attachments.length, 3);
  });

  await t.test("4. Request Listing: listDocumentRequests returns accurate attachment_count", async () => {
    const list = await listDocumentRequests({ officeId: "registrar", search: testStudent.student_no });
    const target = list.find((r) => Number(r.id) === Number(createdParentReq.id));
    assert.ok(target, "Created parent request should appear in list");
    assert.equal(Number(target.attachment_count), 3, "attachment_count should be 3");
  });

  await t.test("5. SPA Verification Workflow: Verify and revoke toggles with audit timeline", async () => {
    // A. Verify SPA
    const verified = await updateSpaVerification(createdParentReq.id, {
      verified: true,
      staffId: testStaff.id,
    });
    assert.equal(verified.spa_verified, true, "spa_verified should be true");
    assert.equal(verified.spa_verified_by, testStaff.id, "spa_verified_by should be staff ID");
    assert.ok(verified.spa_verified_at, "spa_verified_at should have a timestamp");

    // Check timeline update logged
    const updatesAfterVerify = await query(
      "SELECT * FROM transaction_updates WHERE document_request_id = $1 ORDER BY id DESC LIMIT 1",
      [createdParentReq.id]
    );
    assert.ok(updatesAfterVerify[0].message.includes("Special Power of Attorney (SPA) and authorization documents verified"));

    // B. Revoke SPA verification
    const revoked = await updateSpaVerification(createdParentReq.id, {
      verified: false,
      staffId: testStaff.id,
    });
    assert.equal(revoked.spa_verified, false, "spa_verified should be false");
    assert.equal(revoked.spa_verified_by, null, "spa_verified_by should be null");
    assert.equal(revoked.spa_verified_at, null, "spa_verified_at should be null");

    // Check timeline update logged for revocation
    const updatesAfterRevoke = await query(
      "SELECT * FROM transaction_updates WHERE document_request_id = $1 ORDER BY id DESC LIMIT 1",
      [createdParentReq.id]
    );
    assert.ok(updatesAfterRevoke[0].message.includes("Special Power of Attorney (SPA) verification status revoked"));
  });

  await t.test("6. Student Persona: Attachments are optional and zero-attachment requests succeed", async () => {
    createdStudentReq = await createDocumentRequest({
      officeId: "registrar",
      studentNo: testStudent.student_no,
      docType: "Certificate of Grades",
      notes: "Regular student request without attachments",
      clientType: "Student",
      createdBy: testStaff.id,
    });

    assert.ok(createdStudentReq?.id, "Student document request should be created");
    assert.equal(createdStudentReq.client_type, "Student");

    const attachments = await getRequestAttachments(createdStudentReq.id);
    assert.equal(attachments.length, 0, "Student request should have 0 attachments");

    const hydrated = await getDocumentRequestById(createdStudentReq.id, { officeId: "registrar" });
    assert.equal(hydrated.attachments.length, 0);
  });

  await t.test("7. Cascade Deletion: Deleting request automatically removes linked attachments", async () => {
    // Verify attachments currently exist
    const beforeCount = await queryOne(
      "SELECT COUNT(*) AS count FROM document_request_attachments WHERE document_request_id = $1",
      [createdParentReq.id]
    );
    assert.equal(Number(beforeCount.count), 3);

    // Delete the document request
    await query("DELETE FROM transaction_updates WHERE document_request_id = $1", [createdParentReq.id]);
    await query("DELETE FROM document_requests WHERE id = $1", [createdParentReq.id]);

    // Check that child attachments were cascade-deleted
    const afterCount = await queryOne(
      "SELECT COUNT(*) AS count FROM document_request_attachments WHERE document_request_id = $1",
      [createdParentReq.id]
    );
    assert.equal(Number(afterCount.count), 0, "All attachments must be deleted via ON DELETE CASCADE");

    createdParentReq = null; // Prevent double cleanup
  });
});

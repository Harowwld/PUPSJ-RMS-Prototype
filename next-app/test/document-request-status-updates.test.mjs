import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { query, queryOne } = await import("../src/lib/postgres.js");
const { createDocumentRequest, updateDocumentRequest } = await import("../src/lib/documentRequestsRepo.js");
const { DEFAULT_REQUEST_STATUS_MESSAGES } = await import("../src/lib/constants.js");

test("Document Request Status Transition Auto-Logging & Deduplication Suite", async (t) => {
  let testStudentAccount = null;
  let testStaff = null;
  let createdReq = null;

  t.before(async () => {
    testStudentAccount = await queryOne(
      "SELECT id, student_no FROM student_accounts WHERE status = 'Active' LIMIT 1"
    );
    assert.ok(testStudentAccount, "A test student account must exist in the database");

    testStaff = await queryOne(
      "SELECT id FROM staff WHERE status = 'Active' LIMIT 1"
    );
    assert.ok(testStaff, "A test staff account must exist in the database");
  });

  t.after(async () => {
    if (createdReq?.id) {
      await query("DELETE FROM transaction_updates WHERE document_request_id = $1", [createdReq.id]);
      await query("DELETE FROM document_requests WHERE id = $1", [createdReq.id]);
    }
  });

  await t.test("1. Creating document request initializes status 'Pending' and initial timeline update", async () => {
    createdReq = await createDocumentRequest({
      officeId: "registrar",
      studentNo: testStudentAccount.student_no,
      docType: "Certificate of Grades",
      notes: "Unit test request for timeline synchronization",
      clientType: "Student",
      studentAccountId: testStudentAccount.id,
      createdBy: testStaff.id,
    });

    assert.ok(createdReq?.id, "Document request should be created");
    assert.equal(createdReq.status, "Pending");
    assert.ok(Array.isArray(createdReq.updates), "Updates should be an array");
    assert.equal(createdReq.updates.length, 1);
    assert.equal(createdReq.updates[0].status, "Pending");
  });

  await t.test("2. Changing status to 'Ready' without a custom message auto-generates a 'Ready' timeline update", async () => {
    const updated = await updateDocumentRequest(createdReq.id, {
      status: "Ready",
      officeId: "registrar",
      updatedBy: testStaff.id,
    });

    assert.ok(updated, "Update should succeed");
    assert.equal(updated.status, "Ready");
    assert.equal(updated.updates.length, 2, "Updates should now have 2 records");
    
    const latestUpdate = updated.updates[updated.updates.length - 1];
    assert.equal(latestUpdate.status, "Ready");
    assert.equal(
      latestUpdate.message,
      DEFAULT_REQUEST_STATUS_MESSAGES.Ready,
      "Latest update must have default citizen-friendly message for 'Ready'"
    );
  });

  await t.test("3. Re-saving with identical status and no message does not create a duplicate timeline entry", async () => {
    const updated = await updateDocumentRequest(createdReq.id, {
      status: "Ready",
      notes: "Updated internal notes only",
      officeId: "registrar",
      updatedBy: testStaff.id,
    });

    assert.ok(updated);
    assert.equal(updated.status, "Ready");
    assert.equal(updated.updates.length, 2, "Updates count must remain 2 (no duplicate 'Ready' milestone)");
  });

  await t.test("4. Posting a follow-up message while status remains 'Ready' adds an update", async () => {
    const updated = await updateDocumentRequest(createdReq.id, {
      status: "Ready",
      message: "Please present two valid IDs when claiming.",
      officeId: "registrar",
      updatedBy: testStaff.id,
    });

    assert.ok(updated);
    assert.equal(updated.updates.length, 3, "Updates count should now be 3");
    const latestUpdate = updated.updates[updated.updates.length - 1];
    assert.equal(latestUpdate.status, "Ready");
    assert.equal(latestUpdate.message, "Please present two valid IDs when claiming.");
  });

  await t.test("5. Rapid repeat submission with identical status and message is deduplicated", async () => {
    const updated = await updateDocumentRequest(createdReq.id, {
      status: "Ready",
      message: "Please present two valid IDs when claiming.",
      officeId: "registrar",
      updatedBy: testStaff.id,
    });

    assert.ok(updated);
    assert.equal(updated.updates.length, 3, "Updates count must stay 3 (duplicate skipped)");
  });
});

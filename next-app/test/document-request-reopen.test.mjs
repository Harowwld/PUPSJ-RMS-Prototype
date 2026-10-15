import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { query, queryOne } = await import("../src/lib/postgres.js");
const { createDocumentRequest, updateDocumentRequest } = await import("../src/lib/documentRequestsRepo.js");
const { signSessionToken } = await import("../src/lib/jwt.js");
const { registerSessionToken } = await import("../src/lib/authSessions.js");
const { generateCSRFToken } = await import("../src/lib/csrfProtection.js");
const {
  canTransitionRequestStatus,
  canReopenRequestStatus,
  isTerminalRequestStatus,
  ALLOWED_REOPEN_TRANSITIONS,
} = await import("../src/lib/constants.js");

test("Edge Case #7: Reopening Closed/Terminal Document Requests Test Suite", async (t) => {
  let testStudentAccount = null;
  let testStaff = null;
  let createdReq = null;
  let httpApiReq = null;

  t.before(async () => {
    testStudentAccount = await queryOne(
      "SELECT id, student_no FROM student_accounts WHERE status = 'Active' LIMIT 1"
    );
    assert.ok(testStudentAccount, "A test student account must exist in the database");

    testStaff = await queryOne(
      "SELECT id, role, email, office_id FROM staff WHERE office_id = 'registrar' AND status = 'Active' LIMIT 1"
    );
    assert.ok(testStaff, "A test registrar staff account must exist in the database");
  });

  t.after(async () => {
    if (createdReq?.id) {
      await query("DELETE FROM transaction_updates WHERE document_request_id = $1", [createdReq.id]);
      await query("DELETE FROM document_requests WHERE id = $1", [createdReq.id]);
    }
    if (httpApiReq?.id) {
      await query("DELETE FROM transaction_updates WHERE document_request_id = $1", [httpApiReq.id]);
      await query("DELETE FROM document_requests WHERE id = $1", [httpApiReq.id]);
    }
  });

  await t.test("1. Transition rules validate terminal reopen matrix correctly", () => {
    assert.equal(isTerminalRequestStatus("Completed"), true);
    assert.equal(isTerminalRequestStatus("Cancelled"), true);
    assert.equal(isTerminalRequestStatus("Shredded"), true);
    assert.equal(isTerminalRequestStatus("InProgress"), false);
    assert.equal(isTerminalRequestStatus("Pending"), false);

    // Without allowReopen, moving out of terminal states is prohibited
    assert.equal(canTransitionRequestStatus("Completed", "InProgress"), false);
    assert.equal(canTransitionRequestStatus("Cancelled", "Pending"), false);
    assert.equal(canTransitionRequestStatus("Shredded", "InProgress"), false);

    // With allowReopen: true, only allowed matrix paths succeed
    assert.equal(canTransitionRequestStatus("Cancelled", "Pending", { allowReopen: true }), true);
    assert.equal(canTransitionRequestStatus("Cancelled", "InProgress", { allowReopen: true }), true);
    assert.equal(canTransitionRequestStatus("Cancelled", "Completed", { allowReopen: true }), false);
    assert.equal(canTransitionRequestStatus("Cancelled", "Ready", { allowReopen: true }), false);

    assert.equal(canTransitionRequestStatus("Completed", "InProgress", { allowReopen: true }), true);
    assert.equal(canTransitionRequestStatus("Completed", "Ready", { allowReopen: true }), true);
    assert.equal(canTransitionRequestStatus("Completed", "Pending", { allowReopen: true }), false);
    assert.equal(canTransitionRequestStatus("Completed", "Cancelled", { allowReopen: true }), false);

    assert.equal(canTransitionRequestStatus("Shredded", "Pending", { allowReopen: true }), true);
    assert.equal(canTransitionRequestStatus("Shredded", "InProgress", { allowReopen: true }), true);
    assert.equal(canTransitionRequestStatus("Shredded", "Completed", { allowReopen: true }), false);
  });

  await t.test("2. Setting up a closed request (Cancelled)", async () => {
    createdReq = await createDocumentRequest({
      officeId: "registrar",
      studentNo: testStudentAccount.student_no,
      docType: "Certificate of Grades",
      notes: "Unit test for reopening closed request",
      clientType: "Student",
      studentAccountId: testStudentAccount.id,
      createdBy: testStaff.id,
    });

    assert.ok(createdReq?.id);
    assert.equal(createdReq.status, "Pending");

    // Cancel the request
    const cancelled = await updateDocumentRequest(createdReq.id, {
      status: "Cancelled",
      officeId: "registrar",
      updatedBy: testStaff.id,
      message: "Cancelled by student request.",
    });

    assert.equal(cancelled.status, "Cancelled");
  });

  await t.test("3. Attempting to reopen Cancelled request without allowReopen fails", async () => {
    await assert.rejects(
      async () => {
        await updateDocumentRequest(createdReq.id, {
          status: "InProgress",
          officeId: "registrar",
          updatedBy: testStaff.id,
        });
      },
      /Cannot transition document request from status "Cancelled" to "InProgress"/
    );
  });

  await t.test("4. Attempting to reopen with short justification (< 5 chars) fails", async () => {
    await assert.rejects(
      async () => {
        await updateDocumentRequest(createdReq.id, {
          status: "InProgress",
          allowReopen: true,
          reopenReason: "fix",
          officeId: "registrar",
          updatedBy: testStaff.id,
        });
      },
      /A written justification \(at least 5 characters\)/
    );
  });

  await t.test("5. Reopening Cancelled -> InProgress with valid justification succeeds and logs milestone", async () => {
    const justification = "Student appeal granted following proof of clearance on 2026-10-15";
    const reopened = await updateDocumentRequest(createdReq.id, {
      status: "InProgress",
      allowReopen: true,
      reopenReason: justification,
      officeId: "registrar",
      updatedBy: testStaff.id,
    });

    assert.ok(reopened);
    assert.equal(reopened.status, "InProgress");

    const latestUpdate = reopened.updates[reopened.updates.length - 1];
    assert.equal(latestUpdate.status, "InProgress");
    assert.equal(
      latestUpdate.message,
      `Request reopened to InProgress. Reason: ${justification}`
    );
  });

  await t.test("6. Advance request to Completed and verify Completed terminal locking", async () => {
    // InProgress -> Ready -> Completed
    await updateDocumentRequest(createdReq.id, {
      status: "Ready",
      officeId: "registrar",
      updatedBy: testStaff.id,
    });

    const completed = await updateDocumentRequest(createdReq.id, {
      status: "Completed",
      officeId: "registrar",
      updatedBy: testStaff.id,
      message: "Document claimed at Registrar counter.",
    });

    assert.equal(completed.status, "Completed");

    // Standard revert to InProgress must fail
    await assert.rejects(
      async () => {
        await updateDocumentRequest(createdReq.id, {
          status: "InProgress",
          officeId: "registrar",
          updatedBy: testStaff.id,
        });
      },
      /Cannot transition document request from status "Completed" to "InProgress"/
    );
  });

  await t.test("7. Reopening Completed -> Ready with justification succeeds", async () => {
    const justification = "Student reported dry seal was missing; re-staging for immediate seal application";
    const reopened = await updateDocumentRequest(createdReq.id, {
      status: "Ready",
      allowReopen: true,
      reopenReason: justification,
      officeId: "registrar",
      updatedBy: testStaff.id,
    });

    assert.ok(reopened);
    assert.equal(reopened.status, "Ready");

    const latestUpdate = reopened.updates[reopened.updates.length - 1];
    assert.equal(latestUpdate.status, "Ready");
    assert.equal(
      latestUpdate.message,
      `Request reopened to Ready. Reason: ${justification}`
    );
  });

  await t.test("8. Invalid reopen target from Completed (e.g. Completed -> Pending) is rejected", async () => {
    // Mark as completed again
    await updateDocumentRequest(createdReq.id, {
      status: "Completed",
      officeId: "registrar",
      updatedBy: testStaff.id,
    });

    await assert.rejects(
      async () => {
        await updateDocumentRequest(createdReq.id, {
          status: "Pending",
          allowReopen: true,
          reopenReason: "Invalid jump straight back to pending",
          officeId: "registrar",
          updatedBy: testStaff.id,
        });
      },
      /Cannot transition document request from status "Completed" to "Pending"/
    );
  });

  await t.test("9. HTTP PATCH /api/document-requests/:id without allowReopen returns 400", async () => {
    httpApiReq = await createDocumentRequest({
      officeId: "registrar",
      studentNo: testStudentAccount.student_no,
      docType: "Certificate of Grades",
      notes: "Unit test for HTTP API reopen",
      clientType: "Student",
      studentAccountId: testStudentAccount.id,
      createdBy: testStaff.id,
    });

    await updateDocumentRequest(httpApiReq.id, {
      status: "Cancelled",
      officeId: "registrar",
      updatedBy: testStaff.id,
      message: "Cancelled for HTTP API test",
    });

    const staffJti = crypto.randomUUID();
    const staffPayload = {
      sub: testStaff.id,
      role: testStaff.role,
      username: testStaff.email,
      officeId: testStaff.office_id,
      office_id: testStaff.office_id,
      jti: staffJti,
      purpose: "access",
    };
    const staffToken = await signSessionToken(staffPayload);
    await registerSessionToken(staffToken);
    const staffCsrf = generateCSRFToken(staffJti);

    const res = await fetch(`http://localhost:3000/api/document-requests/${httpApiReq.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: `pup_session=${staffToken}`,
        "x-csrf-token": staffCsrf,
      },
      body: JSON.stringify({ status: "InProgress" }),
    });

    const json = await res.json();
    assert.equal(res.status, 400);
    assert.equal(json.ok, false);
    assert.match(json.error, /Completed and finalized requests cannot be reverted without reopening authorization/);
  });

  await t.test("10. HTTP PATCH /api/document-requests/:id with short justification (< 5 chars) returns 400", async () => {
    const staffJti = crypto.randomUUID();
    const staffPayload = {
      sub: testStaff.id,
      role: testStaff.role,
      username: testStaff.email,
      officeId: testStaff.office_id,
      office_id: testStaff.office_id,
      jti: staffJti,
      purpose: "access",
    };
    const staffToken = await signSessionToken(staffPayload);
    await registerSessionToken(staffToken);
    const staffCsrf = generateCSRFToken(staffJti);

    const res = await fetch(`http://localhost:3000/api/document-requests/${httpApiReq.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: `pup_session=${staffToken}`,
        "x-csrf-token": staffCsrf,
      },
      body: JSON.stringify({
        status: "InProgress",
        allowReopen: true,
        reopenReason: "abc",
      }),
    });

    const json = await res.json();
    assert.equal(res.status, 400);
    assert.equal(json.ok, false);
    assert.match(json.error, /A written justification \(at least 5 characters\)/);
  });

  await t.test("11. HTTP PATCH /api/document-requests/:id with valid allowReopen & justification succeeds and logs audit trail", async () => {
    const staffJti = crypto.randomUUID();
    const staffPayload = {
      sub: testStaff.id,
      role: testStaff.role,
      username: testStaff.email,
      officeId: testStaff.office_id,
      office_id: testStaff.office_id,
      jti: staffJti,
      purpose: "access",
    };
    const staffToken = await signSessionToken(staffPayload);
    await registerSessionToken(staffToken);
    const staffCsrf = generateCSRFToken(staffJti);

    const justification = "Valid student appeal accepted by department head";
    const res = await fetch(`http://localhost:3000/api/document-requests/${httpApiReq.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: `pup_session=${staffToken}`,
        "x-csrf-token": staffCsrf,
      },
      body: JSON.stringify({
        status: "InProgress",
        allowReopen: true,
        reopenReason: justification,
      }),
    });

    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.data.status, "InProgress");

    // Verify audit log has "Reopen Document Request"
    const audit = await queryOne(
      "SELECT * FROM global_audit_logs WHERE action = 'Reopen Document Request' AND entity_id = $1 ORDER BY id DESC LIMIT 1",
      [String(httpApiReq.id)]
    );
    assert.ok(audit, "An audit log entry for 'Reopen Document Request' must exist");
    assert.match(audit.details, /Valid student appeal accepted/);
  });

  await t.test("12. HTTP PATCH /api/registrar/document-requests/:id supports reopen and logs audit", async () => {
    // Advance httpApiReq to Completed: InProgress -> Ready -> Completed
    await updateDocumentRequest(httpApiReq.id, {
      status: "Ready",
      officeId: "registrar",
      updatedBy: testStaff.id,
    });
    await updateDocumentRequest(httpApiReq.id, {
      status: "Completed",
      officeId: "registrar",
      updatedBy: testStaff.id,
      message: "Completed for registrar HTTP reopen test",
    });

    const staffJti = crypto.randomUUID();
    const staffPayload = {
      sub: testStaff.id,
      role: testStaff.role,
      username: testStaff.email,
      officeId: testStaff.office_id,
      office_id: testStaff.office_id,
      jti: staffJti,
      purpose: "access",
    };
    const staffToken = await signSessionToken(staffPayload);
    await registerSessionToken(staffToken);
    const staffCsrf = generateCSRFToken(staffJti);

    const justification = "Registrar supervisor approved reactivation of student request";
    const res = await fetch(`http://localhost:3000/api/registrar/document-requests/${httpApiReq.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: `pup_session=${staffToken}`,
        "x-csrf-token": staffCsrf,
      },
      body: JSON.stringify({
        status: "Ready",
        allowReopen: true,
        reopenReason: justification,
      }),
    });

    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.data.status, "Ready");

    const audit = await queryOne(
      "SELECT * FROM global_audit_logs WHERE action = 'Reopen Document Request' AND entity_id = $1 ORDER BY id DESC LIMIT 1",
      [String(httpApiReq.id)]
    );
    assert.ok(audit);
    assert.match(audit.details, /Registrar supervisor approved/);
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const { pool, query, queryOne } = await import("../src/lib/postgres.js");
const { hashPassword } = await import("../src/lib/passwordHash.js");
const { archiveStudent } = await import("../src/lib/studentsRepo.js");
const { createDocument } = await import("../src/lib/documentsRepo.js");

test("an archived Registrar student cannot submit a new enrolled-student request", async (t) => {
  const studentNo = `TEST-${Date.now()}`;
  const password = "ArchivedRequestTest2026!";
  let profileId;
  t.after(async () => {
    await query("DELETE FROM global_audit_logs WHERE entity_type = 'document_request' AND entity_id IN (SELECT id::text FROM document_requests WHERE student_no = $1)", [studentNo]);
    await query("DELETE FROM document_requests WHERE student_no = $1", [studentNo]);
    await query("DELETE FROM student_accounts WHERE student_no = $1", [studentNo]);
    await query("DELETE FROM student_office_memberships WHERE student_no = $1", [studentNo]);
    await query("DELETE FROM students WHERE student_no = $1", [studentNo]);
    if (profileId) await query("DELETE FROM student_identity_profiles WHERE id = $1", [profileId]);
    await pool.end();
  });

  const docType = await queryOne(
    "SELECT name FROM document_types WHERE office_id = 'registrar' AND status = 'Active' AND is_requestable = true AND is_compliance = false LIMIT 1"
  );
  assert.ok(docType, "The Registrar needs an active requestable document type");

  const inserted = await query(
    "INSERT INTO students (student_no, name, status) VALUES ($1, $2, 'Active') RETURNING identity_profile_id",
    [studentNo, "ARCHIVED REQUEST TEST"]
  );
  profileId = inserted[0].identity_profile_id;
  await query(
    "INSERT INTO student_accounts (student_no, identity_profile_id, password_hash, status) VALUES ($1, $2, $3, 'Active')",
    [studentNo, profileId, hashPassword(password)]
  );
  await query(
    "INSERT INTO student_office_memberships (student_no, office_id, status) VALUES ($1, 'registrar', 'Active'), ($1, 'osas', 'Active')",
    [studentNo]
  );

  const login = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: studentNo, password }),
  });
  assert.equal(login.status, 200, await login.text());
  const cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const csrfToken = Object.fromEntries(cookie.split("; ").filter(Boolean).map((part) => part.split("="))).pup_csrf || "";

  await archiveStudent(studentNo, { officeId: "registrar" });
  const response = await fetch(`${BASE_URL}/api/student/document-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({ studentNo, clientType: "Student", docType: docType.name, notes: "Need a new enrolled student request" }),
  });
  assert.equal(response.status, 400, await response.text());
  const requests = await query("SELECT id FROM document_requests WHERE student_no = $1", [studentNo]);
  assert.equal(requests.length, 0);

  const staffLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "superadmin@pup.local", password: process.env.DEFAULT_STAFF_PASSWORD || "pupstaff" }),
  });
  assert.equal(staffLogin.status, 200, await staffLogin.text());
  const staffCookie = staffLogin.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const staffCsrfToken = Object.fromEntries(staffCookie.split("; ").filter(Boolean).map((part) => part.split("="))).pup_csrf || "";
  const staffRequest = await fetch(`${BASE_URL}/api/document-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: staffCookie, "x-csrf-token": staffCsrfToken },
    body: JSON.stringify({ officeId: "registrar", studentNo, clientType: "Student", docType: docType.name, notes: "Staff initiated student request" }),
  });
  assert.equal(staffRequest.status, 400, await staffRequest.text());
  assert.equal((await query("SELECT id FROM document_requests WHERE student_no = $1", [studentNo])).length, 0);

  await assert.rejects(
    createDocument({
      officeId: "registrar",
      studentNo,
      docType: docType.name,
      originalFilename: "archive-test.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("archive test"),
    }),
    /Student is not assigned to this office/,
  );
  const documents = await query("SELECT id FROM documents WHERE student_no = $1", [studentNo]);
  assert.equal(documents.length, 0);
});

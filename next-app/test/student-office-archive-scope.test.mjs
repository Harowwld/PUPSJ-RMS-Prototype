import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const { pool, query } = await import("../src/lib/postgres.js");
const { authenticateStudent } = await import("../src/lib/studentAuth.js");
const { archiveStudent } = await import("../src/lib/studentsRepo.js");
const { hashPassword } = await import("../src/lib/passwordHash.js");

async function login(username) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: process.env.DEFAULT_STAFF_PASSWORD || "pupstaff" }),
  });
  assert.equal(response.status, 200, `Login failed for ${username}`);
  const cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const csrfToken = Object.fromEntries(cookie.split("; ").filter(Boolean).map((part) => part.split("="))).pup_csrf || "";
  return { "Content-Type": "application/json", cookie, "x-csrf-token": csrfToken };
}

test("archiving a student in one office preserves their active record in another", async (t) => {
  const studentNo = `TEST-${Date.now()}`;
  const password = "ScopeTestPassword2026!";
  let profileId;
  t.after(async () => {
    await query("DELETE FROM global_audit_logs WHERE entity_id = $1", [studentNo]);
    await query("DELETE FROM student_accounts WHERE student_no = $1", [studentNo]);
    await query("DELETE FROM student_office_memberships WHERE student_no = $1", [studentNo]);
    await query("DELETE FROM students WHERE student_no = $1", [studentNo]);
    if (profileId) await query("DELETE FROM student_identity_profiles WHERE id = $1", [profileId]);
    await pool.end();
  });

  const headers = await login("superadmin@pup.local");
  const layoutResponse = await fetch(`${BASE_URL}/api/storage-layout?officeId=registrar`, { headers });
  assert.equal(layoutResponse.status, 200);
  const layout = (await layoutResponse.json()).data;
  const room = layout.rooms[0];
  const cabinet = room.cabinets[0];
  const drawer = cabinet.drawerIds[0];

  const inserted = await query(
    "INSERT INTO students (student_no, name, status, storage_room, storage_cabinet, storage_drawer) VALUES ($1, $2, 'Active', $3, $4, $5) RETURNING identity_profile_id",
    [studentNo, "OFFICE SCOPE TEST", room.id, cabinet.id, drawer]
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
  const studentLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: studentNo, password }),
  });
  assert.equal(studentLogin.status, 200);
  const studentCookie = studentLogin.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");

  const studentPath = `/api/students/${encodeURIComponent(studentNo)}?officeId=registrar`;

  const archived = await fetch(`${BASE_URL}${studentPath}`, { method: "DELETE", headers });
  assert.equal(archived.status, 200, await archived.text());

  const statuses = await query(
    `SELECT s.status AS global_status, r.status AS registrar_status, o.status AS osas_status
       FROM students s
       JOIN student_office_memberships r ON r.student_no = s.student_no AND r.office_id = 'registrar'
       JOIN student_office_memberships o ON o.student_no = s.student_no AND o.office_id = 'osas'
      WHERE s.student_no = $1`,
    [studentNo]
  );
  assert.deepEqual(statuses[0], {
    global_status: "Active",
    registrar_status: "Archived",
    osas_status: "Active",
  });

  const registrarList = await fetch(`${BASE_URL}/api/students?officeId=registrar&includeArchived=true`, { headers });
  const registrarRows = (await registrarList.json()).data;
  assert.equal(registrarRows.find((row) => row.student_no === studentNo)?.status, "Archived");

  const osasList = await fetch(`${BASE_URL}/api/students?officeId=osas&includeArchived=true`, { headers });
  const osasRows = (await osasList.json()).data;
  assert.equal(osasRows.find((row) => row.student_no === studentNo)?.status, "Active");
  const registrarDetail = await fetch(`${BASE_URL}${studentPath}`, { headers });
  assert.equal((await registrarDetail.json()).data.status, "Archived");
  const osasDetail = await fetch(`${BASE_URL}/api/students/${encodeURIComponent(studentNo)}?officeId=osas`, { headers });
  assert.equal((await osasDetail.json()).data.status, "Active");
  const archivedOfficeEdit = await fetch(`${BASE_URL}${studentPath}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ name: "SHOULD NOT CHANGE" }),
  });
  assert.equal(archivedOfficeEdit.status, 400);
  assert.ok(await authenticateStudent({ studentNo, password }), "The other active office keeps student account access available");
  assert.equal((await fetch(`${BASE_URL}/api/auth/me`, { headers: { cookie: studentCookie } })).status, 200);

  await archiveStudent(studentNo, { officeId: "osas" });
  assert.equal(await authenticateStudent({ studentNo, password }), null, "No active office blocks student account access");
  assert.equal((await fetch(`${BASE_URL}/api/auth/me`, { headers: { cookie: studentCookie } })).status, 401);

  const restored = await fetch(`${BASE_URL}${studentPath}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "Active" }),
  });
  assert.equal(restored.status, 200, await restored.text());
  const restoredStatuses = await query(
    "SELECT office_id, status FROM student_office_memberships WHERE student_no = $1 ORDER BY office_id",
    [studentNo]
  );
  assert.deepEqual(restoredStatuses, [
    { office_id: "osas", status: "Archived" },
    { office_id: "registrar", status: "Active" },
  ]);
  assert.ok(await authenticateStudent({ studentNo, password }), "Restoring one office restores student account access");
  assert.equal((await fetch(`${BASE_URL}/api/auth/me`, { headers: { cookie: studentCookie } })).status, 200);
});

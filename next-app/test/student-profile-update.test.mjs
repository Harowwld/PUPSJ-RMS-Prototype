import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const { pool, query } = await import("../src/lib/postgres.js");

test("student profile update allows name changes and protects archive/restore lifecycle separation", async (t) => {
  const suffix = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const courseCode = `STU${suffix}`;
  const sectionName = `1`;
  const studentNo = `STU-${suffix}`;
  let courseId;

  t.after(async () => {
    await query("DELETE FROM student_office_memberships WHERE student_no = $1 AND office_id = 'registrar'", [studentNo]);
    await query("DELETE FROM students WHERE student_no = $1", [studentNo]);
    await query("DELETE FROM sections WHERE office_id = 'registrar' AND course_code = $1", [courseCode]);
    if (courseId) await query("DELETE FROM courses WHERE office_id = 'registrar' AND id = $1", [courseId]);
    await query("DELETE FROM global_audit_logs WHERE entity_id = ANY($1::text[])", [[studentNo, courseCode]]);
    await query("DELETE FROM global_audit_logs WHERE action = 'Created student' AND details = $1", [studentNo]);
    await pool.end();
  });

  const login = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "admin.registrar@pup.local",
      password: process.env.DEFAULT_STAFF_PASSWORD || "pupstaff",
    }),
  });
  assert.equal(login.status, 200, "Registrar administrator login must succeed");

  const cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const cookies = Object.fromEntries(cookie.split("; ").map((part) => part.split("=")));
  const headers = {
    "Content-Type": "application/json",
    cookie,
    "x-csrf-token": cookies.pup_csrf || "",
  };
  const request = async (pathname, method = "GET", body) => {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };

  const layout = await request("/api/storage-layout?officeId=registrar");
  assert.equal(layout.status, 200);
  const room = layout.body.data.rooms[0];
  const cabinet = room.cabinets[0];
  const drawer = cabinet.drawerIds[0];

  const createdCourse = await request("/api/courses?officeId=registrar", "POST", {
    code: courseCode,
    name: `Course Student Update ${suffix}`,
    blocks: [sectionName],
  });
  assert.equal(createdCourse.status, 201);
  courseId = createdCourse.body.data.id;

  const initialName = `INITIAL NAME ${suffix}`;
  const createdStudent = await request("/api/students?officeId=registrar", "POST", {
    studentNo,
    name: initialName,
    courseCode,
    yearLevel: 2026,
    section: sectionName,
    room: room.id,
    cabinet: cabinet.id,
    drawer,
  });
  assert.equal(createdStudent.status, 201);
  assert.equal(createdStudent.body.data.status, "Active");

  // 1. Updating name without sending status should succeed
  const updatedNameA = `UPDATED NAME A ${suffix}`;
  const patchWithoutStatus = await request(`/api/students/${encodeURIComponent(studentNo)}?officeId=registrar`, "PATCH", {
    name: updatedNameA,
  });
  assert.equal(patchWithoutStatus.status, 200);
  assert.equal(patchWithoutStatus.body.data.name, updatedNameA);

  const fetchAfterA = await request(`/api/students/${encodeURIComponent(studentNo)}?officeId=registrar`);
  assert.equal(fetchAfterA.status, 200);
  assert.equal(fetchAfterA.body.data.name, updatedNameA);
  assert.equal(fetchAfterA.body.data.status, "Active");

  // 2. Updating name while passing current status ("Active") should succeed
  const updatedNameB = `UPDATED NAME B ${suffix}`;
  const patchWithUnchangedStatus = await request(`/api/students/${encodeURIComponent(studentNo)}?officeId=registrar`, "PATCH", {
    name: updatedNameB,
    status: "Active",
  });
  assert.equal(patchWithUnchangedStatus.status, 200);
  assert.equal(patchWithUnchangedStatus.body.data.name, updatedNameB);

  const fetchAfterB = await request(`/api/students/${encodeURIComponent(studentNo)}?officeId=registrar`);
  assert.equal(fetchAfterB.status, 200);
  assert.equal(fetchAfterB.body.data.name, updatedNameB);
  assert.equal(fetchAfterB.body.data.status, "Active");

  // 3. Attempting to change status to "Archived" while modifying name should return 400
  const patchMixedArchive = await request(`/api/students/${encodeURIComponent(studentNo)}?officeId=registrar`, "PATCH", {
    name: `REJECTED NAME ${suffix}`,
    status: "Archived",
  });
  assert.equal(patchMixedArchive.status, 400);
  assert.equal(patchMixedArchive.body.error, "Archive and restore status changes must be submitted separately");

  // 4. Standalone archive should succeed
  const patchArchiveStandalone = await request(`/api/students/${encodeURIComponent(studentNo)}?officeId=registrar`, "PATCH", {
    status: "Archived",
  });
  assert.equal(patchArchiveStandalone.status, 200);
  assert.equal(patchArchiveStandalone.body.data.status, "Archived");

  // 5. Attempting to restore and modify name in one request should return 400
  const patchMixedRestore = await request(`/api/students/${encodeURIComponent(studentNo)}?officeId=registrar`, "PATCH", {
    name: `REJECTED RESTORE NAME ${suffix}`,
    status: "Active",
  });
  assert.equal(patchMixedRestore.status, 400);
  assert.equal(patchMixedRestore.body.error, "Archive and restore status changes must be submitted separately");

  // 6. Standalone restore should succeed
  const patchRestoreStandalone = await request(`/api/students/${encodeURIComponent(studentNo)}?officeId=registrar`, "PATCH", {
    status: "Active",
  });
  assert.equal(patchRestoreStandalone.status, 200);
  assert.equal(patchRestoreStandalone.body.data.status, "Active");

  // Final check: name remains updatedNameB
  const finalFetch = await request(`/api/students/${encodeURIComponent(studentNo)}?officeId=registrar`);
  assert.equal(finalFetch.status, 200);
  assert.equal(finalFetch.body.data.name, updatedNameB);
  assert.equal(finalFetch.body.data.status, "Active");
});

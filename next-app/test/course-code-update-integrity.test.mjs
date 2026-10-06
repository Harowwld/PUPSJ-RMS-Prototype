import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const { pool, query } = await import("../src/lib/postgres.js");

test("course code changes keep student references valid and protect used blocks", async (t) => {
  const suffix = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const oldCode = `ZST${suffix}`;
  const newCode = `ZST${suffix}N`;
  const blockName = `ZSTUDENT-${suffix}`;
  const studentNo = `ZZST${suffix}`;
  let courseId;

  t.after(async () => {
    await query("DELETE FROM student_office_memberships WHERE student_no = $1 AND office_id = 'registrar'", [studentNo]);
    await query("DELETE FROM students WHERE student_no = $1", [studentNo]);
    await query("DELETE FROM sections WHERE office_id = 'registrar' AND course_code = ANY($1::text[])", [[oldCode, newCode]]);
    if (courseId) await query("DELETE FROM courses WHERE office_id = 'registrar' AND id = $1", [courseId]);
    await query(
      "DELETE FROM global_audit_logs WHERE entity_id = ANY($1::text[])",
      [[oldCode, newCode, studentNo, String(courseId || "")]],
    );
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
    code: oldCode,
    name: `Course Rename Integrity ${suffix}`,
    blocks: [blockName],
  });
  assert.equal(createdCourse.status, 201);
  courseId = createdCourse.body.data.id;

  const createdStudent = await request("/api/students?officeId=registrar", "POST", {
    studentNo,
    name: `Course Rename Student ${suffix}`,
    courseCode: oldCode,
    yearLevel: 2026,
    section: blockName,
    room: Number(room.id),
    cabinet: cabinet.id,
    drawer: Number(drawer),
    status: "Active",
  });
  assert.equal(createdStudent.status, 201);

  const renamedCourse = await request(`/api/courses?id=${courseId}&officeId=registrar`, "PUT", {
    code: newCode,
    name: `Renamed Course Integrity ${suffix}`,
    blocks: [blockName],
  });
  assert.equal(renamedCourse.status, 200);
  assert.equal(renamedCourse.body.data.code, newCode);

  const student = await request(`/api/students/${encodeURIComponent(studentNo)}?officeId=registrar`);
  assert.equal(student.status, 200);
  assert.equal(student.body.data.course_code, newCode);

  const removedUsedBlock = await request(`/api/courses?id=${courseId}&officeId=registrar`, "PUT", {
    code: newCode,
    name: `Renamed Course Integrity ${suffix}`,
    blocks: [],
  });
  assert.equal(removedUsedBlock.status, 409);

  const sections = await request("/api/sections?officeId=registrar&includeArchived=true");
  assert.equal(sections.status, 200);
  assert.equal(
    sections.body.data.find((section) => section.name === blockName && section.course_code === newCode)?.status,
    "Active",
  );

});

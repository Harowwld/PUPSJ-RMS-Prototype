import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import assert from "node:assert/strict";
import { canAccessPage } from "../src/lib/roleUtils.js";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const STAFF_PASSWORD = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";

async function login(username, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(res.status, 200, `Login failed for ${username}: ${res.status}`);
  const setCookies = res.headers.getSetCookie();
  const cookieHeader = setCookies.map((c) => c.split(";")[0]).join("; ");
  const json = await res.json();
  assert.ok(json.ok, `Login response ok was false for ${username}`);
  return { cookieHeader, user: json.data?.user };
}

async function runTests() {
  console.log("=== STARTING STUDENT CRUD & ROLE ACCESS TEST ===");

  // 1. Role page accessibility tests
  console.log("\n[Test 1] Testing canAccessPage boundaries...");
  assert.equal(canAccessPage("/admin", "Staff"), false, "Staff must NOT access /admin");
  assert.equal(canAccessPage("/admin", "Admin"), true, "Admin must access /admin");
  assert.equal(canAccessPage("/admin", "SuperAdmin"), false, "SuperAdmin must NOT access /admin");
  assert.equal(canAccessPage("/staff", "Staff"), true, "Staff must access /staff");
  assert.equal(canAccessPage("/staff", "Admin"), true, "Admin must access /staff");
  assert.equal(canAccessPage("/staff", "SuperAdmin"), false, "SuperAdmin must NOT access /staff");
  assert.equal(canAccessPage("/systemadmin", "Staff"), false, "Staff must NOT access /systemadmin");
  assert.equal(canAccessPage("/systemadmin", "Admin"), false, "Admin must NOT access /systemadmin");
  assert.equal(canAccessPage("/systemadmin", "SuperAdmin"), true, "SuperAdmin must access /systemadmin");
  console.log("✓ canAccessPage correctly enforces staff and admin role boundaries.");

  // 2. Login as Registrar Staff
  console.log("\n[Test 2] Logging in as Registrar Staff...");
  const staff = await login("staff.registrar@pup.local", STAFF_PASSWORD);
  assert.ok(staff.cookieHeader, "Must obtain session cookies for staff");
  console.log("✓ Logged in as Registrar Staff.");

  // 3. Registrar Staff creates a student
  console.log("\n[Test 3] Fetching storage layout to get valid storage locations...");
  const layoutRes = await fetch(`${BASE_URL}/api/storage-layout`, {
    headers: { Cookie: staff.cookieHeader },
  });
  const layoutJson = await layoutRes.json();
  assert.ok(layoutJson.ok, "Layout fetch should succeed");
  const testRoomId = layoutJson.data?.rooms?.[0]?.id || 1;
  const testCabinetId = layoutJson.data?.rooms?.[0]?.cabinets?.[0]?.id || "2020";
  const testDrawerId = layoutJson.data?.rooms?.[0]?.cabinets?.[0]?.drawerIds?.[0] || 1;
  console.log(`Using storage location: Room ${testRoomId}, Cabinet ${testCabinetId}, Drawer ${testDrawerId}`);

  const testStudentNo = `TEST-${Date.now().toString().slice(-6)}-SJ-0`;
  console.log(`\nCreating student record ${testStudentNo} as Staff...`);
  const createRes = await fetch(`${BASE_URL}/api/students`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: staff.cookieHeader,
    },
    body: JSON.stringify({
      studentNo: testStudentNo,
      name: "TEST AUTONOMOUS STUDENT",
      courseCode: "BSIT",
      yearLevel: 2026,
      section: "1-1",
      room: testRoomId,
      cabinet: testCabinetId,
      drawer: testDrawerId,
      status: "Active",
    }),
  });
  const createJson = await createRes.json();
  assert.equal(createRes.status, 201, `Staff student creation failed: ${JSON.stringify(createJson)}`);
  assert.ok(createJson.ok, "Student create response must be ok: true");
  console.log("✓ Registrar Staff successfully created student.");

  // 4. Registrar Staff edits the student (PATCH)
  console.log(`\n[Test 4] Editing student ${testStudentNo} (PATCH) as Staff...`);
  const patchRes = await fetch(`${BASE_URL}/api/students/${encodeURIComponent(testStudentNo)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: staff.cookieHeader,
    },
    body: JSON.stringify({
      name: "TEST AUTONOMOUS STUDENT EDITED",
    }),
  });
  const patchJson = await patchRes.json();
  assert.equal(patchRes.status, 200, `Staff student edit failed: ${JSON.stringify(patchJson)}`);
  assert.ok(patchJson.ok, "Staff PATCH student must return ok: true");
  assert.equal(patchJson.data?.name, "TEST AUTONOMOUS STUDENT EDITED");
  console.log("✓ Registrar Staff successfully edited student profile.");

  // 5. Registrar Staff archives the student (DELETE)
  console.log(`\n[Test 5] Archiving student ${testStudentNo} (DELETE) as Staff...`);
  const deleteRes = await fetch(`${BASE_URL}/api/students/${encodeURIComponent(testStudentNo)}`, {
    method: "DELETE",
    headers: {
      Cookie: staff.cookieHeader,
    },
  });
  const deleteJson = await deleteRes.json();
  assert.equal(deleteRes.status, 200, `Staff student archive failed: ${JSON.stringify(deleteJson)}`);
  assert.ok(deleteJson.ok, "Staff DELETE student must return ok: true");
  assert.equal(deleteJson.data?.status, "Archived");
  console.log("✓ Registrar Staff successfully archived student.");

  // 6. Registrar Staff restores the student (PATCH status: Active)
  console.log(`\n[Test 6] Restoring student ${testStudentNo} (PATCH status: Active) as Staff...`);
  const restoreRes = await fetch(`${BASE_URL}/api/students/${encodeURIComponent(testStudentNo)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: staff.cookieHeader,
    },
    body: JSON.stringify({
      status: "Active",
    }),
  });
  const restoreJson = await restoreRes.json();
  assert.equal(restoreRes.status, 200, `Staff student restore failed: ${JSON.stringify(restoreJson)}`);
  assert.ok(restoreJson.ok, "Staff student restore must return ok: true");
  assert.equal(restoreJson.data?.status, "Active");
  console.log("✓ Registrar Staff successfully restored student.");

  // 7. Registrar Staff queries archived students (includeArchived=true)
  console.log("\n[Test 7] Querying students with includeArchived=true as Staff...");
  const archivedRes = await fetch(`${BASE_URL}/api/students?includeArchived=true`, {
    headers: { Cookie: staff.cookieHeader },
  });
  const archivedJson = await archivedRes.json();
  assert.equal(archivedRes.status, 200, `Querying archived students failed: ${JSON.stringify(archivedJson)}`);
  assert.ok(archivedJson.ok, "Archived query must return ok: true");
  assert.ok(Array.isArray(archivedJson.data), "Archived students data must be an array");
  console.log("✓ Registrar Staff successfully queried archived students.");

  // 8. Registrar Staff executes Batch Student Import (POST /api/students/batch)
  console.log("\n[Test 8] Executing batch student import as Staff with 1-digit grade level...");
  const batchStudentNo1 = `BATCH-${Date.now().toString().slice(-5)}1-SJ-0`;
  const batchStudentNo2 = `BATCH-${Date.now().toString().slice(-5)}2-SJ-0`;
  const batchRes = await fetch(`${BASE_URL}/api/students/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: staff.cookieHeader,
    },
    body: JSON.stringify({
      rows: [
        {
          studentNo: batchStudentNo1,
          name: "DELA CRUZ, JUAN PAULO",
          courseCode: "BSIT",
          yearLevel: 1, // 1-digit grade level normalized to cohort year
          section: "1-1",
          room: testRoomId,
          cabinet: testCabinetId,
          drawer: testDrawerId,
        },
        {
          studentNo: batchStudentNo2,
          name: "SANTOS, MARIA CLARA",
          courseCode: "BSIT",
          yearLevel: 2026,
          section: "1-1",
          room: testRoomId,
          cabinet: testCabinetId,
          drawer: testDrawerId,
        },
      ],
    }),
  });
  const batchJson = await batchRes.json();
  assert.equal(batchRes.status, 200, `Staff batch upload failed: ${JSON.stringify(batchJson)}`);
  assert.ok(batchJson.ok, "Batch upload response must return ok: true");
  assert.ok(Array.isArray(batchJson.data), "Batch data must be an array");
  assert.equal(batchJson.data.length, 2, "Must return 2 results");
  assert.equal(batchJson.data[0].ok, true, `First row failed: ${batchJson.data[0].error}`);
  assert.equal(batchJson.data[1].ok, true, `Second row failed: ${batchJson.data[1].error}`);
  console.log("✓ Registrar Staff successfully imported batch of students (both 1-digit and 4-digit years).");

  // 9. Verify Staff is FORBIDDEN from Admin-only endpoints
  console.log("\n[Test 9] Verifying Staff is forbidden from Admin endpoints...");
  const adminStaffListRes = await fetch(`${BASE_URL}/api/staff`, {
    headers: { Cookie: staff.cookieHeader },
  });
  assert.equal(adminStaffListRes.status, 403, "Staff must be 403 Forbidden from /api/staff");

  const adminBackupRes = await fetch(`${BASE_URL}/api/system/backup`, {
    headers: { Cookie: staff.cookieHeader },
  });
  assert.equal(adminBackupRes.status, 403, "Staff must be 403 Forbidden from /api/system/backup");

  const adminAnalyticsRes = await fetch(`${BASE_URL}/api/analytics/digitization-compliance`, {
    headers: { Cookie: staff.cookieHeader },
  });
  assert.equal(adminAnalyticsRes.status, 403, "Staff must be 403 Forbidden from /api/analytics/digitization-compliance");
  console.log("✓ Staff is strictly forbidden from all Admin-only endpoints (403).");

  // 10. Verify Registrar Admin can access both Staff and Admin endpoints
  console.log("\n[Test 10] Verifying Registrar Admin access to both Staff and Admin operations...");
  const admin = await login("admin.registrar@pup.local", STAFF_PASSWORD);
  const adminStaffCheck = await fetch(`${BASE_URL}/api/staff`, {
    headers: { Cookie: admin.cookieHeader },
  });
  assert.equal(adminStaffCheck.status, 200, "Admin must access /api/staff");

  const adminStudentCheck = await fetch(`${BASE_URL}/api/students`, {
    headers: { Cookie: admin.cookieHeader },
  });
  assert.equal(adminStudentCheck.status, 200, "Admin must access /api/students");
  console.log("✓ Registrar Admin can access both Admin and Staff operations.");

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

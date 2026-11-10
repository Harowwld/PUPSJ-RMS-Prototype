import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const { pool, query } = await import("../src/lib/postgres.js");

async function login(username, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const cookies = Object.fromEntries(cookie.split("; ").filter(Boolean).map((part) => part.split("=")));
  return { response, cookie, csrfToken: cookies.pup_csrf || "" };
}

test("office deactivation blocks office staff sessions until reactivation", async (t) => {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const officeId = `crud-${suffix}`.slice(0, 40);
  const adminEmail = `admin-${suffix}@example.test`;
  const adminId = `PUP${officeId.toUpperCase()}-001`;
  const password = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
  let officeCreated = false;

  t.after(async () => {
    if (officeCreated) {
      await query("DELETE FROM global_audit_logs WHERE office_id = $1 OR entity_id = $1", [officeId]);
      await query("DELETE FROM staff WHERE office_id = $1 OR id = $2", [officeId, adminId]);
      await query("DELETE FROM office_modules WHERE office_id = $1", [officeId]);
      await query("DELETE FROM offices WHERE id = $1", [officeId]);
    }
    await pool.end();
  });

  const systemAdmin = await login("superadmin@pup.local", password);
  assert.equal(systemAdmin.response.status, 200);
  const systemHeaders = {
    "Content-Type": "application/json",
    cookie: systemAdmin.cookie,
    "x-csrf-token": systemAdmin.csrfToken,
  };

  const created = await fetch(`${BASE_URL}/api/offices`, {
    method: "POST",
    headers: systemHeaders,
    body: JSON.stringify({
      id: officeId,
      name: `CRUD Office ${suffix}`,
      short_name: `CRUD ${suffix}`,
      adminEmail,
    }),
  });
  assert.equal(created.status, 201, await created.text());
  officeCreated = true;
  const previouslyArchivedId = `PUP${officeId.toUpperCase()}-002`;
  await query(
    `INSERT INTO staff (id, office_id, fname, lname, role, section, status, email, password_hash)
     SELECT $1, office_id, fname, lname, 'Staff', section, 'Archived', $2, password_hash
       FROM staff WHERE id = $3`,
    [previouslyArchivedId, `archived-${suffix}@example.test`, adminId]
  );

  const officeUrl = `${BASE_URL}/api/offices/${encodeURIComponent(officeId)}`;
  const officeRead = await fetch(officeUrl, { headers: systemHeaders });
  assert.equal(officeRead.status, 200);
  assert.equal((await officeRead.json()).data.id, officeId);
  const officeUpdate = await fetch(officeUrl, {
    method: "PATCH",
    headers: systemHeaders,
    body: JSON.stringify({ description: `Updated ${suffix}` }),
  });
  assert.equal(officeUpdate.status, 200);
  const officeReadback = await fetch(officeUrl, { headers: systemHeaders });
  assert.equal((await officeReadback.json()).data.description, `Updated ${suffix}`);

  const modulesUrl = `${BASE_URL}/api/offices/${encodeURIComponent(officeId)}/modules`;
  const assignments = await fetch(modulesUrl, { headers: systemHeaders });
  assert.equal(assignments.status, 200);
  const moduleRows = (await assignments.json()).data;
  const configurableModule = moduleRows.find((module) => !module.is_system);
  assert.ok(configurableModule, "Office must have a configurable non-system module");
  const enabledModuleIds = moduleRows.filter((module) => module.enabled).map((module) => module.id);
  const disabledModuleIds = enabledModuleIds.filter((moduleId) => moduleId !== configurableModule.id);

  const disabled = await fetch(modulesUrl, {
    method: "PUT",
    headers: systemHeaders,
    body: JSON.stringify({ moduleIds: disabledModuleIds }),
  });
  assert.equal(disabled.status, 200);
  const disabledReadback = await fetch(modulesUrl, { headers: systemHeaders });
  const disabledRows = (await disabledReadback.json()).data;
  assert.equal(disabledReadback.status, 200);
  assert.equal(disabledRows.find((module) => module.id === configurableModule.id)?.enabled, false);

  const restoredModules = await fetch(modulesUrl, {
    method: "PUT",
    headers: systemHeaders,
    body: JSON.stringify({ moduleIds: enabledModuleIds }),
  });
  assert.equal(restoredModules.status, 200);
  const restoredReadback = await fetch(modulesUrl, { headers: systemHeaders });
  const restoredRows = (await restoredReadback.json()).data;
  assert.equal(restoredReadback.status, 200);
  assert.equal(restoredRows.find((module) => module.id === configurableModule.id)?.enabled, true);

  const officeAdmin = await login(adminEmail, password);
  assert.equal(officeAdmin.response.status, 200, "Office administrator can sign in while office is active");
  const staffHeaders = { cookie: officeAdmin.cookie };
  const officeCoursesUrl = `${BASE_URL}/api/courses?officeId=${encodeURIComponent(officeId)}`;
  assert.equal((await fetch(officeCoursesUrl, { headers: staffHeaders })).status, 200);

  const archived = await fetch(`${BASE_URL}/api/offices/${encodeURIComponent(officeId)}`, {
    method: "DELETE",
    headers: systemHeaders,
  });
  assert.equal(archived.status, 200);

  const archivedStaff = await query(
    "SELECT id, status, archived_by_office FROM staff WHERE office_id = $1 ORDER BY id",
    [officeId]
  );
  assert.deepEqual(archivedStaff, [
    { id: adminId, status: "Archived", archived_by_office: true },
    { id: previouslyArchivedId, status: "Archived", archived_by_office: false },
  ]);
  const directory = await fetch(`${BASE_URL}/api/staff?officeId=${encodeURIComponent(officeId)}&limit=500`, {
    headers: systemHeaders,
  });
  assert.equal(directory.status, 200);
  assert.equal((await directory.json()).data.find((member) => member.id === adminId)?.status, "Archived");

  const existingSession = await fetch(officeCoursesUrl, { headers: staffHeaders });
  assert.equal(existingSession.status, 401, "Existing staff session is rejected after office deactivation");

  const blockedLogin = await login(adminEmail, password);
  assert.equal(blockedLogin.response.status, 403, "New login is rejected while office is inactive");

  const restored = await fetch(`${BASE_URL}/api/offices/${encodeURIComponent(officeId)}`, {
    method: "PATCH",
    headers: systemHeaders,
    body: JSON.stringify({ status: "Active" }),
  });
  assert.equal(restored.status, 200);

  const restoredStaff = await query(
    "SELECT id, status, archived_by_office FROM staff WHERE office_id = $1 ORDER BY id",
    [officeId]
  );
  assert.deepEqual(restoredStaff, [
    { id: adminId, status: "Active", archived_by_office: false },
    { id: previouslyArchivedId, status: "Archived", archived_by_office: false },
  ]);

  const resumedSession = await fetch(officeCoursesUrl, { headers: staffHeaders });
  assert.equal(resumedSession.status, 200, "Unchanged staff account resumes after office reactivation");

  const patchedArchive = await fetch(officeUrl, {
    method: "PATCH",
    headers: systemHeaders,
    body: JSON.stringify({ status: "Inactive" }),
  });
  assert.equal(patchedArchive.status, 200);
  const patchedArchivedStaff = await query(
    "SELECT status, archived_by_office FROM staff WHERE id = $1",
    [adminId]
  );
  assert.deepEqual(patchedArchivedStaff[0], { status: "Archived", archived_by_office: true });

  const patchedRestore = await fetch(officeUrl, {
    method: "PATCH",
    headers: systemHeaders,
    body: JSON.stringify({ status: "Active" }),
  });
  assert.equal(patchedRestore.status, 200);
  const patchedRestoredStaff = await query(
    "SELECT status, archived_by_office FROM staff WHERE id = $1",
    [adminId]
  );
  assert.deepEqual(patchedRestoredStaff[0], { status: "Active", archived_by_office: false });
});

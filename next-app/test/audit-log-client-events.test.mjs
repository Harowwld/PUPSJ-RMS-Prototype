import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/app/api/audit-logs/route.js", import.meta.url), "utf8");
const eventsSource = source.slice(source.indexOf("const CLIENT_AUDIT_EVENTS"), source.indexOf("export async function GET"));
const postSource = source.slice(source.indexOf("export async function POST"))
  .replace(/^export /, "");

function postHandler(user, writes) {
  const bindings = {
    NextResponse: { json: (body, init) => Response.json(body, init) },
    requireAuth: async () => ({ user }),
    createAuthErrorResponse: (error, status) => Response.json({ ok: false, error }, { status }),
    isAdmin: (principal) => ["Admin", "SuperAdmin", "SystemAdmin"].includes(principal.role),
    getPrincipalOfficeId: (principal) => principal.officeId || null,
    getStaffFullName: (principal) => `${principal.fname} ${principal.lname}`.trim(),
    createGlobalAuditLog: async (entry) => { writes.push(entry); },
  };
  return new Function(...Object.keys(bindings), `${eventsSource}\n${postSource}\nreturn POST;`)(...Object.values(bindings));
}

function request(body) {
  return new Request("http://localhost/api/audit-logs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const staff = {
  id: "STAFF-1",
  principalType: "staff",
  role: "Staff",
  officeId: "registrar",
  fname: "Ada",
  lname: "Reyes",
};

test("client cannot forge an audit actor, role, or security action", async () => {
  const writes = [];
  const response = await postHandler(staff, writes)(request({
    action: "Restore System Backup",
    actor: "System",
    role: "System",
    details: "Backup restored",
  }));
  assert.equal(response.status, 400);
  assert.equal(writes.length, 0);
});

test("allowed action with forged metadata is rejected", async () => {
  const writes = [];
  const response = await postHandler(staff, writes)(request({
    action: "Export Student Directory",
    actor: "System",
    role: "SuperAdmin",
  }));
  assert.equal(response.status, 400);
  assert.equal(writes.length, 0);
});

test("unknown client event is rejected", async () => {
  const writes = [];
  const response = await postHandler(staff, writes)(request({ action: "Rotate Password" }));
  assert.equal(response.status, 400);
  assert.equal(writes.length, 0);
});

test("inherited object names are not accepted as events", async () => {
  const writes = [];
  const response = await postHandler(staff, writes)(request({ action: "toString" }));
  assert.equal(response.status, 400);
  assert.equal(writes.length, 0);
});

test("student cannot submit a directory export event", async () => {
  const writes = [];
  const response = await postHandler({ ...staff, principalType: "student", role: "Student" }, writes)(
    request({ action: "Export Student Directory" })
  );
  assert.equal(response.status, 403);
  assert.equal(writes.length, 0);
});

test("staff cannot submit an admin report event", async () => {
  const writes = [];
  const response = await postHandler(staff, writes)(request({ action: "Export CSV" }));
  assert.equal(response.status, 403);
  assert.equal(writes.length, 0);
});

test("ordinary staff cannot claim an admin-only directory export", async () => {
  const writes = [];
  const response = await postHandler(staff, writes)(request({ action: "Export Student Directory" }));
  assert.equal(response.status, 403);
  assert.equal(writes.length, 0);
});

test("directory export records the authenticated admin identity", async () => {
  const writes = [];
  const response = await postHandler({ ...staff, role: "Admin" }, writes)(request({ action: "Export Student Directory" }));
  assert.equal(response.status, 200);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].actor, "Ada Reyes");
  assert.equal(writes[0].actor_id, "STAFF-1");
  assert.equal(writes[0].role, "Admin");
  assert.equal(writes[0].action, "Student Directory Export Requested");
  assert.equal(writes[0].details, "Requested a student directory CSV export.");
  assert.equal(writes[0].severity, "WARNING");
});

test("each browser report event remains available to admins", async () => {
  const actions = [
    "Exported Activity History to CSV",
    "Generated Activity History PDF Report",
    "Export Taxonomy",
    "Export CSV",
    "Generate Report",
    "Generate OSAS Compliance PDF",
    "Print Report",
  ];
  for (const action of actions) {
    const writes = [];
    const response = await postHandler({ ...staff, role: "Admin" }, writes)(request({ action }));
    assert.equal(response.status, 200, action);
    assert.equal(writes.length, 1, action);
    assert.equal(writes[0].role, "Admin", action);
    assert.equal(writes[0].actor_id, "STAFF-1", action);
  }
});

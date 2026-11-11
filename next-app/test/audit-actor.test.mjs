import test from "node:test";
import assert from "node:assert/strict";
import { resolveAuditActorIds, resolveAuditActorDisplayNames } from "../src/lib/auditActor.js";
import { getStaffDisplayName, getStaffFullName } from "../src/lib/staffRepo.js";

test("personal name preference does not shorten staff attribution", () => {
  const staff = { id: "PUPREGISTRAR-003", fname: "Elias", lname: "Austria", preferences: { display_name_format: "first_only" } };
  assert.equal(getStaffDisplayName(staff), "Elias");
  assert.equal(getStaffFullName(staff), "Elias Austria");
});

test("resolves unique staff names to stable IDs despite casing and spacing", () => {
  const logs = [{ actor: "  ELIAS   AUSTRIA ", role: "Admin" }];
  const staff = [{ id: "PUPREGISTRAR-003", fname: "Elias", lname: "Austria", role: "Admin" }];

  assert.deepEqual(resolveAuditActorIds(logs, staff), [
    { ...logs[0], actor_id: "PUPREGISTRAR-003", avatar_filename: null },
  ]);
});

test("uses the role to disambiguate duplicate staff names", () => {
  const logs = [{ actor: "Alex Reyes", role: "Staff" }];
  const staff = [
    { id: "PUPREGISTRAR-001", fname: "Alex", lname: "Reyes", role: "Admin" },
    { id: "PUPOSAS-001", fname: "Alex", lname: "Reyes", role: "Staff" },
  ];

  assert.deepEqual(resolveAuditActorIds(logs, staff), [
    { ...logs[0], actor_id: "PUPOSAS-001", avatar_filename: null },
  ]);
});

test("does not guess when staff names remain ambiguous", () => {
  const logs = [{ actor: "Alex Reyes", role: "Staff" }];
  const staff = [
    { id: "PUPOSAS-001", fname: "Alex", lname: "Reyes", role: "Staff" },
    { id: "PUPOSAS-002", fname: "Alex", lname: "Reyes", role: "Staff" },
  ];

  assert.deepEqual(resolveAuditActorIds(logs, staff), [
    { ...logs[0], actor_id: null, avatar_filename: null },
  ]);
});

test("uses the student identifier and omits system actors", () => {
  assert.deepEqual(
    resolveAuditActorIds([
      { actor: "2024-12345", role: "Student" },
      { actor: "System", role: "System" },
    ]),
    [
      { actor: "2024-12345", role: "Student", actor_id: "2024-12345", avatar_filename: null },
      { actor: "System", role: "System", actor_id: null, avatar_filename: null },
    ]
  );
});

test("shows the current full name while retaining the recorded actor snapshot", () => {
  const staff = [{ id: "PUPREGISTRAR-003", fname: "Elias", lname: "Austria", role: "Admin" }];
  const logs = resolveAuditActorIds(
    [{ actor: "Elias", actor_id: "PUPREGISTRAR-003", role: "Admin" }],
    staff
  );

  assert.deepEqual(resolveAuditActorDisplayNames(logs, staff), [
    { actor: "Elias", actor_id: "PUPREGISTRAR-003", role: "Admin", avatar_filename: null, actor_display_name: "Elias Austria" },
  ]);
});

test("leaves ambiguous legacy names unchanged", () => {
  const staff = [
    { id: "1", fname: "Alex", lname: "Reyes", role: "Staff" },
    { id: "2", fname: "Alex", lname: "Santos", role: "Staff" },
  ];
  const logs = resolveAuditActorIds([{ actor: "Alex", role: "Staff" }], staff);

  assert.equal(logs[0].actor_id, null);
  assert.equal(resolveAuditActorDisplayNames(logs, staff)[0].actor_display_name, undefined);
});

test("addresses known actors by name in historical email-based descriptions", () => {
  const staff = [{ id: "PUPREGISTRAR-003", fname: "Elias", lname: "Austria" }];
  const details = "personnel 'elias@example.edu' successfully terminated system session and secure credentials";
  const [log] = resolveAuditActorDisplayNames([
    { actor: "Elias Austria", actor_id: "PUPREGISTRAR-003", role: "Staff", action: "User Logout", details },
  ], staff);

  assert.equal(log.details, "personnel 'Elias Austria' successfully terminated system session and secure credentials");
  assert.equal(log.recorded_details, details);
});

test("keeps unrecognized sign-in identifiers as recorded", () => {
  const details = "authentication failure: identifier 'unknown@example.edu' not recognized";
  const [log] = resolveAuditActorDisplayNames([
    { actor: "System", role: "System", action: "Login Attempt", details },
  ]);
  assert.equal(log.details, details);
});

test("resolves registered students without a student number from account ID or email", () => {
  const students = [{ id: 42, student_no: null, email: "learner@example.edu", first_name: "Ada", last_name: "Reyes" }];
  const logs = resolveAuditActorIds([
    { actor: "learner@example.edu", role: "Student" },
    { actor: "42", actor_id: "42", role: "Student" },
  ], [], students);
  const displayed = resolveAuditActorDisplayNames(logs, [], students);
  assert.deepEqual(displayed.map((log) => log.actor_display_name), ["Ada Reyes", "Ada Reyes"]);
  assert.deepEqual(displayed.map((log) => log.actor_id), ["42", "42"]);
});

test("does not attribute an empty legacy student actor to another account", () => {
  const students = [{ id: 42, student_no: null, email: "learner@example.edu", first_name: "Ada", last_name: "Reyes" }];
  const logs = resolveAuditActorIds([{ actor: "", role: "Student" }], [], students);
  assert.equal(logs[0].actor_id, null);
  assert.equal(resolveAuditActorDisplayNames(logs, [], students)[0].actor_display_name, undefined);
});

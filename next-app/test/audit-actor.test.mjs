import test from "node:test";
import assert from "node:assert/strict";
import { resolveAuditActorIds } from "../src/lib/auditActor.js";

test("resolves unique staff names to stable IDs despite casing and spacing", () => {
  const logs = [{ actor: "  ELIAS   AUSTRIA ", role: "Admin" }];
  const staff = [{ id: "PUPREGISTRAR-003", fname: "Elias", lname: "Austria", role: "Admin" }];

  assert.deepEqual(resolveAuditActorIds(logs, staff), [
    { ...logs[0], actor_id: "PUPREGISTRAR-003" },
  ]);
});

test("uses the role to disambiguate duplicate staff names", () => {
  const logs = [{ actor: "Alex Reyes", role: "Staff" }];
  const staff = [
    { id: "PUPREGISTRAR-001", fname: "Alex", lname: "Reyes", role: "Admin" },
    { id: "PUPOSAS-001", fname: "Alex", lname: "Reyes", role: "Staff" },
  ];

  assert.deepEqual(resolveAuditActorIds(logs, staff), [
    { ...logs[0], actor_id: "PUPOSAS-001" },
  ]);
});

test("does not guess when staff names remain ambiguous", () => {
  const logs = [{ actor: "Alex Reyes", role: "Staff" }];
  const staff = [
    { id: "PUPOSAS-001", fname: "Alex", lname: "Reyes", role: "Staff" },
    { id: "PUPOSAS-002", fname: "Alex", lname: "Reyes", role: "Staff" },
  ];

  assert.deepEqual(resolveAuditActorIds(logs, staff), [
    { ...logs[0], actor_id: null },
  ]);
});

test("uses the student identifier and omits system actors", () => {
  assert.deepEqual(
    resolveAuditActorIds([
      { actor: "2024-12345", role: "Student" },
      { actor: "System", role: "System" },
    ]),
    [
      { actor: "2024-12345", role: "Student", actor_id: "2024-12345" },
      { actor: "System", role: "System", actor_id: null },
    ]
  );
});

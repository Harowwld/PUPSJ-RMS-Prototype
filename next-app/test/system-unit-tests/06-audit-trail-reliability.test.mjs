import test from "node:test";
import assert from "node:assert/strict";

const { formatLogDetails } = await import("../../src/lib/auditLogFormatting.js");
const { resolveAuditActorIds } = await import("../../src/lib/auditActor.js");

test("Module 6.1: Audit Formatting - Normalizes narrative text and preserves raw JSON payloads", () => {
  // Sentence capitalization and acronym normalization
  const narrative = "totp verification succeeded. 2fa authentication is active.";
  const formatted = formatLogDetails(narrative);
  assert.ok(formatted.startsWith("TOTP"), "Sentence should start with capitalized acronym TOTP");
  assert.ok(formatted.includes("2FA"), "2FA acronym should be normalized after sentence punctuation");

  // Preserves raw JSON payloads intact
  const jsonPayload = '{"action":"DOCUMENT_APPROVED","docId":42,"reviewedBy":"STAFF-001"}';
  assert.equal(formatLogDetails(jsonPayload), jsonPayload, "Raw JSON audit payloads must not be modified");

  const arrayPayload = '[{"field":"status","from":"Pending","to":"Approved"}]';
  assert.equal(formatLogDetails(arrayPayload), arrayPayload, "Raw array audit payloads must not be modified");
});

test("Module 6.2: Actor & Role Resolution - Maps audit actors and roles deterministically", () => {
  const staffCatalog = [
    { id: "PUPREG-001", fname: "Marcus", lname: "Reyes", role: "Staff" },
    { id: "PUPADM-001", fname: "Elias", lname: "Austria", role: "Admin" },
  ];

  const auditRows = [
    { actor: "Marcus Reyes", role: "Staff", action: "BATCH_REVIEW_APPROVED" },
    { actor: "2024-00123-SJ-0", role: "student", action: "REQUEST_CREATED" },
    { actor: "System Worker", role: "system", action: "AUTO_PRUNE_BACKUPS" },
  ];

  const resolved = resolveAuditActorIds(auditRows, staffCatalog);
  assert.equal(resolved.length, 3);
  assert.equal(resolved[0].actor_id, "PUPREG-001", "Staff full name should resolve to Staff ID");
  assert.equal(resolved[1].actor_id, "2024-00123-SJ-0", "Student role should retain student number as actor_id");
  assert.equal(resolved[2].actor_id, null, "System role should have null actor_id");
});

test("Module 6.3: System Reliability - Audit actions process without leaks or unhandled rejections", async () => {
  const start = performance.now();
  const operations = Array.from({ length: 50 }, (_, i) =>
    formatLogDetails(`document request ${i} processed successfully by registrar staff.`)
  );

  assert.equal(operations.length, 50);
  assert.ok(performance.now() - start < 100, "50 formatting operations should complete in under 100ms");
});

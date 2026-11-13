import test from "node:test";
import assert from "node:assert/strict";

const {
  canTransitionRequestStatus,
  isTerminalRequestStatus,
  REQUEST_STATUSES,
} = await import("../../src/lib/constants.js");
const {
  getRangeIds,
  toggleSelectedId,
  getRowClickSelection,
} = await import("../../src/lib/batchReviewSelection.js");
const { encryptPII, decryptPII } = await import("../../src/lib/piiEncryption.js");

test("Module 4.1: Request Workflow - Valid state transitions follow lifecycle order", () => {
  // Typical happy-path transitions
  assert.equal(canTransitionRequestStatus("Pending", "InProgress"), true);
  assert.equal(canTransitionRequestStatus("InProgress", "Ready"), true);
  assert.equal(canTransitionRequestStatus("Ready", "Completed"), true);
  assert.equal(canTransitionRequestStatus("Pending", "Cancelled"), true);
});

test("Module 4.2: State Machine Guards - Invalid lifecycle transitions are rejected", () => {
  // Invalid jumps
  assert.equal(canTransitionRequestStatus("Pending", "Shredded"), false, "Cannot shred a pending request");
  assert.equal(canTransitionRequestStatus("Cancelled", "Completed"), false, "Cannot complete a cancelled request");
  assert.equal(canTransitionRequestStatus("Cancelled", "Ready"), false, "Cannot make a cancelled request ready");

  // Terminal statuses
  assert.equal(isTerminalRequestStatus("Completed"), true);
  assert.equal(isTerminalRequestStatus("Cancelled"), true);
  assert.equal(isTerminalRequestStatus("Pending"), false);
});

test("Module 4.3: Batch Review Workflow - Range and toggle selections work accurately", () => {
  const rows = [{ id: 101 }, { id: 102 }, { id: 103 }, { id: 104 }, { id: 105 }];

  // Range selection (Shift-click from 102 to 104)
  const range = getRangeIds(rows, 102, 104);
  assert.deepEqual(range, [102, 103, 104]);

  // Toggle selection (Ctrl/Cmd-click on 103)
  const toggled = toggleSelectedId([101, 102], 103);
  assert.deepEqual(toggled, [101, 102, 103]);

  // Toggle off (Ctrl/Cmd-click on 102)
  const toggledOff = toggleSelectedId([101, 102, 103], 102);
  assert.deepEqual(toggledOff, [101, 103]);

  // Direct single click
  const single = getRowClickSelection(rows, { anchorId: 101, selectedIds: [101] }, 105);
  assert.deepEqual(single, { anchorId: 105, selectedIds: [105] });
});

test("Module 4.4: PII Security - Sensitive student request details are encrypted and decrypted accurately", () => {
  const sensitiveStudentData = JSON.stringify({
    studentNo: "2024-00123-SJ-0",
    homeAddress: "123 San Juan City, Metro Manila",
    emergencyContact: "+639171234567",
    guardianName: "Juana Dela Cruz",
  });

  const ciphertext = encryptPII(sensitiveStudentData);
  assert.ok(ciphertext && typeof ciphertext === "string", "Ciphertext must be a valid string");
  assert.notEqual(ciphertext, sensitiveStudentData, "Ciphertext must not be plaintext");

  const decrypted = decryptPII(ciphertext);
  assert.equal(decrypted, sensitiveStudentData, "Decrypted data must match original plaintext");
});

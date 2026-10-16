import test from "node:test";
import assert from "node:assert/strict";
import {
  getAdjacentRowId,
  getBulkActionSkipReason,
  getRowClickSelection,
  getRangeIds,
} from "../src/lib/batchReviewSelection.js";

const rows = [{ id: 4 }, { id: 8 }, { id: 12 }, { id: 16 }];

test("Shift selection includes the anchor and target in queue order", () => {
  assert.deepEqual(getRangeIds(rows, 8, 16), [8, 12, 16]);
  assert.deepEqual(getRangeIds(rows, 16, 8), [8, 12, 16]);
});

test("plain click selects one row and establishes the range anchor", () => {
  assert.deepEqual(getRowClickSelection(rows, { anchorId: null, activeId: 4, selectedIds: [4] }, 8), {
    anchorId: 8,
    selectedIds: [8],
  });
});

test("Shift-click selects the inclusive range from the original anchor", () => {
  assert.deepEqual(getRowClickSelection(rows, { anchorId: 8, activeId: 8, selectedIds: [8] }, 16, { shiftKey: true }), {
    anchorId: 8,
    selectedIds: [8, 12, 16],
  });
});

test("modifier click toggles only the target while keeping the range anchor", () => {
  assert.deepEqual(getRowClickSelection(rows, { anchorId: 4, activeId: 8, selectedIds: [4, 8] }, 8, { modifierKey: true }), {
    anchorId: 4,
    selectedIds: [4],
  });
  assert.deepEqual(getRowClickSelection(rows, { anchorId: 4, activeId: 8, selectedIds: [4] }, 12, { modifierKey: true }), {
    anchorId: 4,
    selectedIds: [4, 12],
  });
});

test("arrow navigation returns the adjacent loaded row and stops at queue edges", () => {
  assert.equal(getAdjacentRowId(rows, 8, "down"), 12);
  assert.equal(getAdjacentRowId(rows, 8, "up"), 4);
  assert.equal(getAdjacentRowId(rows, 4, "up"), null);
  assert.equal(getAdjacentRowId(rows, 16, "down"), null);
});

test("bulk action eligibility mirrors per-file review requirements", () => {
  assert.equal(getBulkActionSkipReason("confirm", { status: "pending", staff_selected_student_no: "2025-1", proposed_doc_type: "PSA" }), "");
  assert.equal(getBulkActionSkipReason("confirm", { status: "pending", proposed_doc_type: "PSA" }), "Student or document type is missing");
  assert.equal(getBulkActionSkipReason("retry", { status: "failed" }), "");
  assert.notEqual(getBulkActionSkipReason("retry", { status: "pending" }), "");
  assert.equal(getBulkActionSkipReason("dismiss", { status: "promoted" }), "File is no longer eligible for dismissal");
});

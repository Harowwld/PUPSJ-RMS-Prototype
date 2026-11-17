import assert from "node:assert/strict";
import test from "node:test";
import { validatePostEventRevision } from "../src/lib/osasPostEventWorkflow.js";

const report = {
  narrative_storage_filename: "narrative.pdf",
  liquidation_storage_filename: "receipts.pdf",
  actual_attendance: 40,
  total_expenses: "48.50",
};
const unchanged = { actualAttendance: 40, totalExpenses: 48.5 };

test("a liquidation-only revision reuses the narrative and requires the requested file", () => {
  const targeted = { ...report, revision_files: ["liquidation"] };
  assert.match(validatePostEventRevision(targeted, { ...unchanged, narrative: true }), /every replacement/);
  assert.equal(validatePostEventRevision(targeted, { ...unchanged, liquidation: true }), null);
  assert.match(validatePostEventRevision({ ...targeted, narrative_storage_filename: null }, {
    ...unchanged, liquidation: true,
  }), /narrative report/);
});

test("a details-only revision requires an actual change and supports older reports", () => {
  assert.match(validatePostEventRevision(report, unchanged), /update the report details/);
  assert.equal(validatePostEventRevision(report, { ...unchanged, actualAttendance: 42 }), null);
  assert.equal(validatePostEventRevision(report, { ...unchanged, narrative: true }), null);
});

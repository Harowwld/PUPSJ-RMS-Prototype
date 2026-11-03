import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeTableDensity, tablePreferenceKey, paginationRange, tableStatusTone } from "../src/lib/tablePresentation.js";

test("density keys isolate people and principal types and reject invalid values", () => {
  assert.equal(tablePreferenceKey(null), null);
  assert.notEqual(tablePreferenceKey({ id: "42", role: "Staff" }), tablePreferenceKey({ id: "42", role: "Student" }));
  assert.notEqual(tablePreferenceKey({ id: "42" }), tablePreferenceKey({ id: "43" }));
  for (const value of [null, undefined, "wide", "__proto__", "toString", ""]) assert.equal(normalizeTableDensity(value), "normal");
  assert.equal(normalizeTableDensity("comfortable"), "comfortable");
});

test("pagination handles empty results, partial pages, invalid input and shrinking totals", () => {
  assert.deepEqual(paginationRange({ totalCount: 0 }), { page: 1, totalPages: 1, start: 0, end: 0, total: 0 });
  assert.deepEqual(paginationRange({ page: 3, pageSize: 10, totalCount: 23, displayedCount: 3 }), { page: 3, totalPages: 3, start: 21, end: 23, total: 23 });
  assert.deepEqual(paginationRange({ page: 5, pageSize: 10, totalCount: 13 }), { page: 2, totalPages: 2, start: 11, end: 13, total: 13 });
  assert.equal(paginationRange({ page: -2, totalCount: 30 }).page, 1);
  assert.equal(paginationRange({ totalCount: 10, displayedCount: 0 }).end, 0);
  assert.equal(paginationRange({ page: "2", pageSize: "20", totalCount: "23" }).start, 21);
});

test("status tones preserve domain meanings and safely default unfamiliar states", () => {
  assert.equal(tableStatusTone("Approved"), "success");
  assert.equal(tableStatusTone("Declined"), "danger");
  assert.equal(tableStatusTone("Pending"), "warning");
  assert.equal(tableStatusTone("InProgress"), "info");
  assert.equal(tableStatusTone("Archived"), "neutral");
  assert.equal(tableStatusTone("Future status"), "neutral");
});

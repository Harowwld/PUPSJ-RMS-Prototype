import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeTableDensity, tablePreferenceKey, paginationRange, tableStatusTone, sizeContentColumns } from "../src/lib/tablePresentation.js";

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

test("visible columns retain minimums and share available width after hiding and restoring fields", () => {
  const columns = [
    { kind: "selection" },
    { kind: "text", minWidth: 320, maxWidth: 420 },
    { kind: "text", minWidth: 190, maxWidth: 340 },
    { kind: "status", width: 120 },
    { kind: "actions" },
  ];
  const widths = (visible, viewport) => sizeContentColumns(visible, visible.map(() => 0), visible.map(() => 10), viewport);
  assert.deepEqual(widths(columns, 600), [48, 320, 190, 120, 48]);
  const withoutTitle = columns.filter((_, index) => index !== 1);
  assert.deepEqual(widths(withoutTitle, 450), [48, 234, 120, 48]);
  assert.deepEqual(widths(withoutTitle, 1200), [48, 984, 120, 48]);
  assert.deepEqual(widths(columns, 600), [48, 320, 190, 120, 48]);
});

test("a very long value does not take width away from the other text fields", () => {
  const columns = [{ kind: "text" }, { kind: "text" }, { kind: "year" }, { kind: "actions" }];
  assert.deepEqual(sizeContentColumns(columns, [200, 18, 4, 0], [4, 4, 4, 0], 760), [403.5, 243.5, 65, 48]);
});

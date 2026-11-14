import assert from "node:assert/strict";
import test from "node:test";
import { orderRowsByGroup } from "../src/lib/groupRows.js";

test("grouped rows stay together across page boundaries and preserve their sort within each group", () => {
  const rows = [
    { id: 5, status: "Pending" },
    { id: 4, status: "Approved" },
    { id: 3, status: "Pending" },
    { id: 2, status: "Approved" },
    { id: 1, status: "Pending" },
  ];
  const ordered = orderRowsByGroup(rows, (row) => row.status);
  assert.deepEqual(ordered.slice(0, 2).map((row) => row.id), [5, 3]);
  assert.deepEqual(ordered.slice(2, 4).map((row) => row.id), [1, 4]);
  assert.deepEqual(ordered.slice(4).map((row) => row.id), [2]);
  assert.deepEqual(rows.map((row) => row.id), [5, 4, 3, 2, 1]);

  const alphabetical = orderRowsByGroup(rows, (row) => row.status, (left, right) => left.localeCompare(right));
  assert.deepEqual(alphabetical.map((row) => row.id), [4, 2, 5, 3, 1]);
});

import test from "node:test";
import assert from "node:assert/strict";
import { scopeOfficeDump } from "../src/lib/officeBackupScope.js";

test("office dump keeps only the selected office's records", () => {
  const dump = [
    "COPY public.documents (id, office_id, storage_filename) FROM stdin;",
    "1\tregistrar\tregistrar.pdf",
    "2\tother-office\tother.pdf",
    "\\.",
    "COPY public.students (student_no, name) FROM stdin;",
    "2024-1\tStudent One",
    "2024-2\tStudent Two",
    "\\.",
  ].join("\n");
  const result = scopeOfficeDump(dump, {
    documents: { column: "office_id", values: ["registrar"] },
    students: { column: "student_no", values: ["2024-1"] },
  });
  assert.match(result, /registrar\.pdf/);
  assert.match(result, /2024-1/);
  assert.doesNotMatch(result, /other\.pdf|2024-2/);
  assert.equal((result.match(/\\\./g) || []).length, 2);
});

test("office dump refuses a table without a row scope", () => {
  assert.throws(() => scopeOfficeDump("COPY public.documents (id, office_id) FROM stdin;\n1\tregistrar\n\\.", {}), /no row scope/);
});

test("office dump filters transaction updates by their owning request or proposal", () => {
  const dump = "COPY public.transaction_updates (id, document_request_id, event_proposal_id) FROM stdin;\n1\t10\t\\N\n2\t\\N\t20\n3\t11\t\\N\n\\.";
  const result = scopeOfficeDump(dump, {
    transaction_updates: { predicate: (row) => row.document_request_id === "10" || row.event_proposal_id === "20" },
  });
  assert.match(result, /1\t10/);
  assert.match(result, /2\t\\N\t20/);
  assert.doesNotMatch(result, /3\t11/);
});

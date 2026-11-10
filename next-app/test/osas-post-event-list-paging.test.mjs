import test, { mock } from "node:test";
import assert from "node:assert/strict";

let statement;
mock.module("../src/lib/postgres.js", {
  namedExports: {
    query: async (sql, params) => { statement = { sql, params }; return []; },
    queryOne: async () => null,
    transaction: async () => null,
  },
});
mock.module("../src/lib/piiEncryption.js", {
  namedExports: { decryptPII: (value) => value },
});
mock.module("../src/lib/staffRepo.js", {
  namedExports: { getStaffFullName: () => "Reviewer" },
});

const { listPostEventReports } = await import("../src/lib/osasPostEventRepo.js");

test("student report list scopes organizations before reading rows", async () => {
  await listPostEventReports({ organizationIds: ["org-a", "org-b"] });
  assert.match(statement.sql, /per\.organization_id = ANY\(\$1::text\[\]\)/);
  assert.deepEqual(statement.params, [["org-a", "org-b"]]);
});

test("OSAS report list bounds a page with stable ordering", async () => {
  await listPostEventReports({ status: "Submitted", limit: 20, offset: 40 });
  assert.match(statement.sql, /ORDER BY per\.created_at DESC, per\.id DESC/);
  assert.match(statement.sql, /LIMIT \$2 OFFSET \$3/);
  assert.deepEqual(statement.params, ["Submitted", 20, 40]);
});

import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { getOfficeUploadsDir } from "../src/lib/officePaths.js";

const databaseUrl = process.env.SEED_TEST_DATABASE_URL;

test("sample seed completes twice on a populated database and preserves account identity links", {
  skip: !databaseUrl && "Set SEED_TEST_DATABASE_URL to a migrated isolated pupsj_rms_seed_test database.",
  timeout: 30000,
}, async () => {
  const url = new URL(databaseUrl);
  assert.match(url.pathname.slice(1), /^pupsj_rms_seed_test(?:_|$)/, "Use an isolated seed-test database.");
  url.searchParams.set("options", "-c statement_timeout=2000");
  process.env.DATABASE_URL = url.toString();
  const previousDataDir = process.env.LOCAL_DATA_DIR;
  process.env.LOCAL_DATA_DIR = await mkdtemp(path.join(tmpdir(), "pupsj-seed-test-"));
  let pool;
  try {
    const postgres = await import("../src/lib/postgres.js");
    pool = postgres.pool;
    const { resetDatabase } = await import("../src/lib/resetDatabase.js");
    const { seed } = await import("../scripts/populate-sample-data.mjs");
    await resetDatabase();
    for (let attempt = 0; attempt < 2; attempt++) {
      const summary = await seed();
      for (const key of ["students", "documents", "requests", "proposals"]) assert.ok(summary[key] > 0, key);
      const accounts = await postgres.query(`
        SELECT sa.identity_profile_id AS account_identity, s.identity_profile_id AS student_identity
        FROM student_accounts sa JOIN students s ON s.student_no = sa.student_no
      `);
      assert.equal(accounts.length, 2);
      for (const account of accounts) assert.equal(account.account_identity, account.student_identity);
      const documents = await postgres.query("SELECT office_id, storage_filename FROM documents");
      assert.equal(documents.length, summary.documents);
      await Promise.all(documents.map(({ office_id, storage_filename }) =>
        access(path.join(getOfficeUploadsDir(office_id), storage_filename)),
      ));
      const requests = await postgres.query(`
        SELECT dr.status, s.student_no IS NOT NULL AND dr.identity_profile_id = s.identity_profile_id AS linked
        FROM document_requests dr LEFT JOIN students s USING (student_no)
      `);
      assert.deepEqual(new Set(requests.map(({ status }) => status)),
        new Set(["Pending", "InProgress", "Ready", "Cancelled", "Completed"]));
      assert.ok(requests.every(({ linked }) => linked));
      const proposals = await postgres.query(`
        SELECT ep.status, sa.id IS NOT NULL AND oo.id IS NOT NULL AS linked
        FROM event_proposals ep
        LEFT JOIN student_accounts sa ON sa.id = ep.student_account_id AND sa.identity_profile_id = ep.identity_profile_id
        LEFT JOIN organization_officers oo ON oo.organization_id = ep.organization_id
          AND oo.email = ep.submitted_by_email AND oo.student_no = ep.student_no AND oo.status = 'Active'
      `);
      assert.deepEqual(new Set(proposals.map(({ status }) => status)),
        new Set(["Submitted", "Under Review", "Needs Revision", "Approved", "Declined"]));
      assert.ok(proposals.every(({ linked }) => linked));
      const reports = await postgres.query(`
        SELECT r.status, ep.status = 'Approved' AND ep.organization_id = r.organization_id
          AND ep.submitted_by_email = r.submitted_by_email AS linked
        FROM osas_post_event_reports r JOIN event_proposals ep ON ep.id = r.event_proposal_id
      `);
      assert.equal(reports.length, 5);
      assert.deepEqual(new Set(reports.map(({ status }) => status)),
        new Set(["Submitted", "Under Review", "Needs Revision", "Cleared", "Declined"]));
      assert.ok(reports.every(({ linked }) => linked));
    }
  } finally {
    if (pool) await pool.end();
    await rm(process.env.LOCAL_DATA_DIR, { recursive: true, force: true });
    if (previousDataDir === undefined) delete process.env.LOCAL_DATA_DIR;
    else process.env.LOCAL_DATA_DIR = previousDataDir;
  }
});

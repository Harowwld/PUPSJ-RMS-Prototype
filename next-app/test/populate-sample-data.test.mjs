import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

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
      assert.ok(accounts.length >= 3);
      for (const account of accounts) assert.equal(account.account_identity, account.student_identity);
    }
  } finally {
    if (pool) await pool.end();
    await rm(process.env.LOCAL_DATA_DIR, { recursive: true, force: true });
    if (previousDataDir === undefined) delete process.env.LOCAL_DATA_DIR;
    else process.env.LOCAL_DATA_DIR = previousDataDir;
  }
});

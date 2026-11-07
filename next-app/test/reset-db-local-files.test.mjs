import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Pool } from "pg";
import { validateLocalDataResetTarget } from "../src/lib/resetLocalData.js";

test("reset refuses to clear the application directory", async () => {
  const previous = process.env.LOCAL_DATA_DIR;
  process.env.LOCAL_DATA_DIR = process.cwd();
  try {
    await assert.rejects(validateLocalDataResetTarget(), /unsafe local data directory/);
  } finally {
    if (previous === undefined) delete process.env.LOCAL_DATA_DIR;
    else process.env.LOCAL_DATA_DIR = previous;
  }
});

test("development database reset removes local files left by scans and backups", { timeout: 30000 }, async () => {
  const sourceUrl = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(sourceUrl.hostname));
  const databaseName = `pupsj_reset_verify_${process.pid}`;
  const testUrl = new URL(sourceUrl);
  testUrl.pathname = `/${databaseName}`;
  const fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), "pupsj-reset-check-"));
  const localDir = path.join(fixtureDir, ".local");
  const outsideFile = path.join(fixtureDir, "keep.txt");
  const adminPool = new Pool({ connectionString: sourceUrl.toString(), max: 1 });
  let databaseCreated = false;

  try {
    await adminPool.query(`CREATE DATABASE ${databaseName}`);
    databaseCreated = true;
    const fixturePaths = [
      "storage/registrar/uploads/scan.pdf",
      "storage/osas/bylaws/bylaws.pdf",
      "uploads/legacy.pdf",
      "uploads/avatars/avatar.png",
      "osas/uploads/old-proposal.pdf",
      "ingest/queued.pdf",
      "hot-folder/registrar/INBOUND/pending.pdf",
      "backups/old.zip.enc",
      "external_media/old.zip.enc",
    ];
    for (const relativePath of fixturePaths) {
      const filePath = path.join(localDir, relativePath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, relativePath);
    }
    await fs.writeFile(outsideFile, "keep");
    await fs.symlink(outsideFile, path.join(localDir, "outside-link"));

    const testEnv = {
      ...process.env,
      DATABASE_URL: testUrl.toString(),
      LOCAL_DATA_DIR: localDir,
      NODE_ENV: "test",
    };
    execFileSync(process.execPath, ["scripts/run-migrations.mjs"], { env: testEnv, stdio: "pipe" });
    const resetScript = `
      const { resetDatabase } = await import("./src/lib/resetDatabase.js");
      const { pool } = await import("./src/lib/postgres.js");
      try { await resetDatabase(); } finally { await pool.end(); }
    `;
    execFileSync(process.execPath, ["--input-type=module", "-e", resetScript], {
      env: testEnv,
      stdio: "pipe",
    });

    assert.deepEqual(await fs.readdir(localDir), [], "reset left local data behind");
    assert.equal(await fs.readFile(outsideFile, "utf8"), "keep");
  } finally {
    if (databaseCreated) await adminPool.query(`DROP DATABASE ${databaseName} WITH (FORCE)`);
    await adminPool.end();
    await fs.rm(fixtureDir, { recursive: true, force: true });
  }
});

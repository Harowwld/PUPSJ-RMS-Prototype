import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("../../scripts/reset-db.mjs", import.meta.url));

function run(args, env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: "postgres://unused:unused@127.0.0.1:1/unused", ...env },
    encoding: "utf8",
    timeout: 5000,
  });
}

for (const [name, args, env, message] of [
  ["requires explicit confirmation", [], {}, /pass --confirm/],
  ["refuses production", ["--confirm"], { NODE_ENV: "production" }, /unavailable in production/],
  ["refuses remote databases", ["--confirm"], { DATABASE_URL: "postgres://unused:unused@db.example.com/unused" }, /local PostgreSQL host/],
  ["refuses database host overrides", ["--confirm"], { DATABASE_URL: "postgres://unused:unused@localhost/unused?host=db.example.com" }, /local PostgreSQL host/],
  ["requires a PostgreSQL URL", ["--confirm"], { DATABASE_URL: "https://localhost/unused" }, /local PostgreSQL host/],
  ["requires a valid database URL", ["--confirm"], { DATABASE_URL: "invalid" }, /valid local PostgreSQL DATABASE_URL/],
]) {
  test(name, () => {
    const result = run(args, env);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, message);
    assert.doesNotMatch(result.stdout, /Resetting local PostgreSQL/);
    assert.doesNotMatch(result.stderr, /ECONNREFUSED/);
  });
}

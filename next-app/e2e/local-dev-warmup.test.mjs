import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { WARMUP_PATHS, warmLocalRoutes } from "../scripts/warm-local-routes.mjs";

test("local development warm-up requests the public and first-login route surfaces", async () => {
  const originalFetch = globalThis.fetch;
  const requestedPaths = [];
  globalThis.fetch = async (url) => {
    requestedPaths.push(new URL(url).pathname + new URL(url).search);
    return new Response(null, { status: 200 });
  };

  try {
    const result = await warmLocalRoutes("http://127.0.0.1:3000");
    assert.equal(result.failed, 0);
    assert.ok(!WARMUP_PATHS.includes("/api/auth/login"));
    assert.ok(WARMUP_PATHS.includes("/api/account/avatar?id=warmup"));
    assert.deepEqual(requestedPaths.sort(), [...WARMUP_PATHS].sort());
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the local dev launcher starts the warm-up after Next is ready", async () => {
  const launcher = await fs.readFile(new URL("../scripts/start-local-dev.mjs", import.meta.url), "utf8");
  assert.match(launcher, /warm-local-routes\.mjs/);
  assert.match(launcher, /wait-on tcp:3000/);
});

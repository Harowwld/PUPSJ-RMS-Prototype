import assert from "node:assert/strict";
import test from "node:test";

async function harness(fn) {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  globalThis.window = { location: { href: "http://127.0.0.1:3000/staff", origin: "http://127.0.0.1:3000" } };
  const auth = await import(`../../src/lib/clientAuth.js?case=${Math.random()}`);
  try { await fn(auth); } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
}
const response = (status, data) => new Response(JSON.stringify({ data }), { status });
const path = (input) => new URL(input instanceof Request ? input.url : input, window.location.href).pathname;

test("401 rotates once and retries POST with its original body", () => harness(async ({ authFetch }) => {
  const bodies = [];
  let rotations = 0;
  globalThis.fetch = async (input, init) => {
    if (path(input) === "/api/auth/me") return response(401);
    if (path(input) === "/api/auth/refresh") {
      rotations++;
      assert.equal(init.headers["x-session-refresh"], "1");
      return response(200, { expiresAt: Date.now() / 1000 + 900 });
    }
    bodies.push(await input.text());
    return response(bodies.length === 1 ? 401 : 200);
  };
  const result = await authFetch(new Request("http://127.0.0.1:3000/api/documents", { method: "POST", body: "document bytes" }));
  assert.equal(result.status, 200);
  assert.equal(rotations, 1);
  assert.deepEqual(bodies, ["document bytes", "document bytes"]);
}));

test("403, external, auth actions, bearer and omitted credentials do not rotate", () => harness(async ({ authFetch }) => {
  const calls = [];
  globalThis.fetch = async (input) => { calls.push(path(input)); return response(403); };
  assert.equal((await authFetch("/api/documents")).status, 403);
  globalThis.fetch = async (input) => { calls.push(path(input)); return response(401); };
  await authFetch("https://example.com/api/documents");
  await authFetch("/api/auth/login", { method: "POST" });
  await authFetch("/api/documents", { headers: { Authorization: "Bearer service-token" } });
  await authFetch("/api/documents", { credentials: "omit" });
  assert.equal(calls.length, 5);
  assert.ok(!calls.includes("/api/auth/refresh"));
}));

test("concurrent expired requests share a rotation and retries are bounded", () => harness(async ({ authFetch }) => {
  let rotations = 0;
  let resourceCalls = 0;
  globalThis.fetch = async (input) => {
    if (path(input) === "/api/auth/me") return response(401);
    if (path(input) === "/api/auth/refresh") {
      rotations++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return response(200, { expiresAt: Date.now() / 1000 + 900 });
    }
    resourceCalls++;
    return response(401);
  };
  const results = await Promise.all([authFetch("/api/documents"), authFetch("/api/students")]);
  assert.deepEqual(results.map((r) => r.status), [401, 401]);
  assert.equal(rotations, 1);
  assert.equal(resourceCalls, 4);
}));

test("failed refresh returns original401; aborted caller does not retry", () => harness(async ({ authFetch }) => {
  let resourceCalls = 0;
  const controller = new AbortController();
  globalThis.fetch = async (input) => {
    if (path(input) === "/api/auth/me") return response(401);
    if (path(input) === "/api/auth/refresh") return response(401);
    resourceCalls++;
    return response(401);
  };
  assert.equal((await authFetch("/api/documents")).status, 401);
  globalThis.fetch = async (input) => {
    if (path(input) === "/api/auth/me") return response(401);
    if (path(input) === "/api/auth/refresh") {
      controller.abort();
      return response(200, { expiresAt: Date.now() / 1000 + 900 });
    }
    resourceCalls++;
    return response(401);
  };
  await assert.rejects(authFetch("/api/documents", { signal: controller.signal }), { name: "AbortError" });
  assert.equal(resourceCalls, 2);
}));

test("installed wrapper is reversible and original fetch serves refresh requests", () => harness(async ({ installSessionFetch }) => {
  const original = globalThis.fetch = async () => response(200);
  const restore = installSessionFetch();
  assert.notEqual(globalThis.fetch, original);
  assert.equal((await fetch("/api/documents")).status, 200);
  restore();
  assert.equal(globalThis.fetch, original);
}));

test("409 waits for the rotated cookie without a second rotation", () => harness(async ({ authFetch }) => {
  let sessionChecks = 0;
  let rotations = 0;
  let resourceCalls = 0;
  globalThis.fetch = async (input) => {
    if (path(input) === "/api/auth/me") {
      return ++sessionChecks === 1 ? response(401) : response(200, { sessionExpiresAt: Date.now() / 1000 + 900 });
    }
    if (path(input) === "/api/auth/refresh") { rotations++; return response(409); }
    return response(++resourceCalls === 1 ? 401 : 200);
  };
  assert.equal((await authFetch("/api/documents")).status, 200);
  assert.equal(rotations, 1);
}));

test("temporary refresh failure preserves the original API response", () => harness(async ({ authFetch, getClientSession }) => {
  let rotations = 0;
  globalThis.fetch = async (input) => {
    if (path(input) === "/api/auth/refresh") { rotations++; return response(503); }
    return response(401);
  };
  assert.equal((await authFetch("/api/documents")).status, 401);
  await assert.rejects(getClientSession(), /temporarily unavailable/);
  assert.equal(rotations, 2);
}));

test("cross-tab lock rechecks the shared cookie and skips a redundant rotation", () => harness(async ({ authFetch }) => {
  const originalLocks = Object.getOwnPropertyDescriptor(navigator, "locks");
  let lockCalls = 0;
  let resourceCalls = 0;
  Object.defineProperty(navigator, "locks", { configurable: true, value: {
    request: async (name, callback) => {
      assert.equal(name, "pupsj-session-refresh");
      lockCalls++;
      return callback();
    },
  } });
  globalThis.fetch = async (input) => {
    if (path(input) === "/api/auth/me") return response(200, { sessionExpiresAt: Date.now() / 1000 + 900 });
    assert.notEqual(path(input), "/api/auth/refresh");
    return response(++resourceCalls === 1 ? 401 : 200);
  };
  try {
    assert.equal((await authFetch("/api/documents")).status, 200);
    assert.equal(lockCalls, 1);
  } finally {
    if (originalLocks) Object.defineProperty(navigator, "locks", originalLocks);
    else delete navigator.locks;
  }
}));

test("initial expired session recovers before the fetch wrapper mounts", () => harness(async ({ getClientSession }) => {
  let rotated = false;
  globalThis.fetch = async (input) => {
    if (path(input) === "/api/auth/refresh") {
      rotated = true;
      return response(200, { expiresAt: Date.now() / 1000 + 900 });
    }
    return rotated ? response(200, { id: "staff-1", sessionExpiresAt: Date.now() / 1000 + 900 }) : response(401);
  };
  const session = await getClientSession();
  assert.equal(session.ok, true);
  assert.equal(session.data.id, "staff-1");
}));

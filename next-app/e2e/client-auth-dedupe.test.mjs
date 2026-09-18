import assert from "node:assert/strict";
import test from "node:test";
import { getClientSession, invalidateClientSession } from "../src/lib/clientAuth.js";

test("concurrent client session checks share one no-store request", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response(JSON.stringify({ ok: true, data: { id: "staff-1", role: "SuperAdmin" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const [first, second] = await Promise.all([getClientSession(), getClientSession()]);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/auth/me");
    assert.equal(calls[0].options.cache, "no-store");
    assert.deepEqual(first, second);
    assert.deepEqual(first.data, { id: "staff-1", role: "SuperAdmin" });

    await getClientSession();
    assert.equal(calls.length, 2, "completed session checks must not be cached");
    invalidateClientSession();
  } finally {
    globalThis.fetch = originalFetch;
    invalidateClientSession();
  }
});

test("login recovery can invalidate an older in-flight session check", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const responses = [];
  globalThis.fetch = async () => {
    calls.push(calls.length + 1);
    return new Promise((resolve) => responses.push(resolve));
  };

  try {
    const staleRequest = getClientSession();
    invalidateClientSession();
    const freshRequest = getClientSession();
    assert.equal(calls.length, 2);

    responses[0](new Response(JSON.stringify({ ok: false }), { status: 401 }));
    responses[1](new Response(JSON.stringify({ ok: true, data: { id: "staff-1" } }), { status: 200 }));
    assert.equal((await staleRequest).status, 401);
    assert.equal((await freshRequest).status, 200);
  } finally {
    globalThis.fetch = originalFetch;
    invalidateClientSession();
  }
});

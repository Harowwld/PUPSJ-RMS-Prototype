import assert from "node:assert/strict";
import test from "node:test";
import { fetchJsonOnce, invalidateInFlightRequest } from "../src/lib/clientRequest.js";

test("concurrent identical GET requests share one request without caching completed data", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response(JSON.stringify({ ok: true, data: [{ id: "registrar" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const [first, second] = await Promise.all([
      fetchJsonOnce("/api/offices?stats=true"),
      fetchJsonOnce("/api/offices?stats=true"),
    ]);
    assert.equal(calls.length, 1);
    assert.deepEqual(first, second);
    assert.deepEqual(first.data, [{ id: "registrar" }]);

    await fetchJsonOnce("/api/offices?stats=true");
    assert.equal(calls.length, 2, "completed responses must not be retained by the in-flight helper");
  } finally {
    globalThis.fetch = originalFetch;
    invalidateInFlightRequest();
  }
});

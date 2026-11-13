import test from "node:test";
import assert from "node:assert/strict";
import { fetchAllPages } from "../src/lib/fetchAllPages.js";

test("fetchAllPages retrieves records beyond the API page limit", async () => {
  const originalFetch = globalThis.fetch;
  const records = Array.from({ length: 501 }, (_, id) => ({ id }));
  const offsets = [];
  globalThis.fetch = async (url) => {
    const parsed = new URL(url, "http://localhost");
    assert.equal(parsed.searchParams.get("includeArchived"), "true");
    const limit = Number(parsed.searchParams.get("limit"));
    const offset = Number(parsed.searchParams.get("offset"));
    offsets.push(offset);
    return { ok: true, json: async () => ({ ok: true, data: records.slice(offset, offset + limit) }) };
  };

  try {
    const result = await fetchAllPages("/api/students?includeArchived=true", 500);
    assert.deepEqual(result, records);
    assert.deepEqual(offsets, [0, 500]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchAllPages fails when a later page cannot be loaded", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const offset = Number(new URL(url, "http://localhost").searchParams.get("offset"));
    return offset === 0
      ? { ok: true, json: async () => ({ ok: true, data: Array.from({ length: 200 }, (_, id) => ({ id })) }) }
      : { ok: false, json: async () => ({ ok: false, error: "Page unavailable" }) };
  };

  try {
    await assert.rejects(fetchAllPages("/api/documents?approvalStatus=Pending", 200), /Page unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

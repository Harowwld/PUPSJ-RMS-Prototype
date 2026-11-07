import test from "node:test";
import assert from "node:assert/strict";

test("hot_key_miss_loads_once: concurrent cache misses coalesce to a single database load", async () => {
  let dbCallCount = 0;

  // Simulated database loader with 50ms latency
  async function loadCoursesFromDatabase() {
    dbCallCount++;
    await new Promise((r) => setTimeout(r, 50));
    return [
      { code: "BSIT", name: "Bachelor of Science in Information Technology" },
      { code: "BSBA", name: "Bachelor of Science in Business Administration" },
    ];
  }

  // Single-flight coalescing cache
  class SingleFlightCache {
    constructor() {
      this.cache = new Map();
      this.inFlight = new Map();
    }

    async getOrLoad(key, loader, { plantBreak = false } = {}) {
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      if (plantBreak) {
        // Planted fault: bypasses single-flight map and queries DB for each caller (stampede)
        const data = await loader();
        this.cache.set(key, data);
        return data;
      }

      // Check if loader is already in flight for this key
      if (this.inFlight.has(key)) {
        return await this.inFlight.get(key);
      }

      const promise = (async () => {
        try {
          const result = await loader();
          this.cache.set(key, result);
          return result;
        } finally {
          this.inFlight.delete(key);
        }
      })();

      this.inFlight.set(key, promise);
      return await promise;
    }
  }

  const sfCache = new SingleFlightCache();
  const plantBreak = process.env.PLANT_BREAK_CACHE_STAMPEDE === "true";

  // Simulate 10 simultaneous concurrent requests for the same hot key
  const concurrentCallers = 10;
  const promises = [];
  for (let i = 0; i < concurrentCallers; i++) {
    promises.push(sfCache.getOrLoad("taxonomy:courses", loadCoursesFromDatabase, { plantBreak }));
  }

  const results = await Promise.all(promises);

  // All callers must receive identical data
  assert.strictEqual(results.length, 10);
  assert.strictEqual(results[0][0].code, "BSIT");

  // Invariant Promise: The database must only be queried ONCE during concurrent miss
  assert.strictEqual(
    dbCallCount,
    1,
    `CRITICAL FAULT: Cache stampede detected! Database was queried ${dbCallCount} times for concurrent misses of the same key.`
  );
});

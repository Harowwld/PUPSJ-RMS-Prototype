import test from "node:test";
import assert from "node:assert/strict";

test("pool_holds_at_burst: rate limiter sheds burst requests once threshold is exceeded", async () => {
  // Configured target: max 5 requests per window
  const MAX_BURST_REQUESTS = 5;
  const ipAddress = "192.168.1.100";

  // In-memory sliding burst counter simulating rate limit store
  class BurstPoolLimiter {
    constructor(limit) {
      this.limit = limit;
      this.counts = new Map();
    }

    check(ip, { plantBreak = false } = {}) {
      const current = this.counts.get(ip) || 0;
      if (plantBreak) {
        // Planted fault: leaks burst and never sheds
        this.counts.set(ip, current + 1);
        return { allowed: true, count: current + 1 };
      }

      if (current >= this.limit) {
        return { allowed: false, count: current, remaining: 0, status: 429 };
      }

      this.counts.set(ip, current + 1);
      return { allowed: true, count: current + 1, remaining: this.limit - (current + 1), status: 200 };
    }
  }

  const limiter = new BurstPoolLimiter(MAX_BURST_REQUESTS);
  const plantBreak = process.env.PLANT_BREAK_BURST_LEAK === "true";

  // First 5 requests must succeed
  for (let i = 1; i <= MAX_BURST_REQUESTS; i++) {
    const res = limiter.check(ipAddress, { plantBreak });
    assert.strictEqual(res.allowed, true, `Request ${i} within burst limit must be allowed`);
  }

  // 6th request is over burst threshold: MUST BE SHED
  const burstExceeded = limiter.check(ipAddress, { plantBreak });
  assert.strictEqual(
    burstExceeded.allowed,
    false,
    "CRITICAL FAULT: Pool did not shed load at burst threshold! Allowed request exceeding limit."
  );
  assert.strictEqual(burstExceeded.status, 429, "Shed burst request must return status 429");
});

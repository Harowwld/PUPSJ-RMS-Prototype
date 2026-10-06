import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { pool, transaction } = await import("../src/lib/postgres.js");

try {
  const cleared = await transaction(async ({ query }) => {
    const hits = await query("DELETE FROM rate_limit_hits");
    const violations = await query("DELETE FROM rate_limit_violations");
    return { hits: hits.rowCount || 0, violations: violations.rowCount || 0 };
  });

  // The application caches denied rate-limit checks for up to two seconds.
  await new Promise((resolve) => setTimeout(resolve, 2100));
  console.log(`[reset-rate-limit] Cleared ${cleared.hits} hits and ${cleared.violations} lockouts.`);
  console.log("[reset-rate-limit] Rate-limit protections remain enabled.");
} catch (error) {
  console.error("[reset-rate-limit] Failed:", error?.message || error);
  process.exitCode = 1;
} finally {
  await pool.end();
}

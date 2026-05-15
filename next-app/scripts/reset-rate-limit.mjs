import { dbRun } from "../src/lib/sqlite.js";

async function resetRateLimits() {
  console.log("Resetting all rate limits...");
  
  try {
    const hitsResult = await dbRun("DELETE FROM rate_limit_hits", []);
    console.log(`- Cleared ${hitsResult.changes} rate limit hits.`);
    
    const violationsResult = await dbRun("DELETE FROM rate_limit_violations", []);
    console.log(`- Cleared ${violationsResult.changes} rate limit violations.`);
    
    console.log("Rate limits reset successfully.");
  } catch (error) {
    console.error("Error resetting rate limits:", error);
  }
}

resetRateLimits();

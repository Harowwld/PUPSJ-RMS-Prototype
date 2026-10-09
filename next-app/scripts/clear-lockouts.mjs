import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { sysDbRun } = await import("../src/lib/systemDb.js");

async function clear() {
  try {
    await sysDbRun("DELETE FROM rate_limit_violations");
    await sysDbRun("DELETE FROM rate_limit_hits");
    console.log("All rate limits cleared!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to clear rate limits:", error?.message || error);
    process.exit(1);
  }
}

clear();


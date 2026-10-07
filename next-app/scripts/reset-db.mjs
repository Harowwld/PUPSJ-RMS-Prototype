import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

async function main() {
  if (!process.argv.includes("--confirm")) {
    throw new Error("Explicit reset confirmation is required: pass --confirm.");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Database reset is unavailable in production.");
  }

  dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
  if (process.env.NODE_ENV === "production") {
    throw new Error("Database reset is unavailable in production.");
  }

  let databaseUrl;
  try {
    databaseUrl = new URL(process.env.DATABASE_URL);
  } catch {
    throw new Error("A valid local PostgreSQL DATABASE_URL is required.");
  }
  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)
    || !["localhost", "127.0.0.1", "[::1]"].includes(databaseUrl.hostname)
    || databaseUrl.searchParams.has("host")
    || databaseUrl.searchParams.has("hostaddr")) {
    throw new Error("Database reset requires a local PostgreSQL host (localhost, 127.0.0.1, or ::1).");
  }

  const { resetDatabase } = await import("../src/lib/resetDatabase.js");
  const { pool } = await import("../src/lib/postgres.js");
  try {
    console.log("[reset-db] Resetting local PostgreSQL data and seeding demo accounts.");
    await resetDatabase();
    console.log("[reset-db] Reset completed. Restart the Next.js server if needed, then run: pnpm populate-sample-data");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`[reset-db] ${error.message}`);
  process.exitCode = 1;
});

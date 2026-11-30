import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

dotenv.config({ path: ".env" });
const { pool } = await import("../src/lib/postgres.js");

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, "..", "migrations");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Copy .env.example to .env and start Docker PostgreSQL first.");
}

const client = await pool.connect();
try {
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  const files = (await fs.readdir(migrationsDir)).filter(file => /^\d+_.+\.(sql|mjs)$/.test(file)).sort();
  for (const filename of files) {
    const applied = await client.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [filename]);
    if (applied.rowCount) continue;
    const migrationPath = path.join(migrationsDir, filename);
    await client.query("BEGIN");
    try {
      if (filename.endsWith(".sql")) {
        await client.query(await fs.readFile(migrationPath, "utf8"));
      } else {
        const { default: migrate } = await import(pathToFileURL(migrationPath).href);
        await migrate(client);
      }
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
      await client.query("COMMIT");
      console.log(`Applied ${filename}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  client.release();
  await pool.end();
}

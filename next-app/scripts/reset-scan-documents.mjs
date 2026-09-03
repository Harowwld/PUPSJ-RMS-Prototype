import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const { query, pool } = await import("../src/lib/postgres.js");

const localDir = path.resolve(process.env.LOCAL_DATA_DIR || ".local");
const scannerDirs = [
  path.join(localDir, "hot-folder", "INBOUND"),
  path.join(localDir, "hot-folder", "DONE"),
  path.join(localDir, "hot-folder", "FAILED"),
  path.join(localDir, "hot-folder", "PROCESSING"),
  path.join(localDir, "ingest"),
  path.join(localDir, "uploads"),
];

const client = await pool.connect();
try {
  await client.query("BEGIN");
  const before = (await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM documents) AS documents,
      (SELECT COUNT(*)::int FROM ingest_queue) AS ingest_queue
  `)).rows[0];

  // Clear queue rows first because they reference promoted documents.
  await client.query("DELETE FROM ingest_queue");
  await client.query("DELETE FROM documents");
  await client.query("COMMIT");

  const clearedFiles = {};
  for (const dir of scannerDirs) {
    await fs.mkdir(dir, { recursive: true });
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let count = 0;
    for (const entry of entries) {
      if (entry.isFile()) {
        await fs.unlink(path.join(dir, entry.name));
        count += 1;
      }
    }
    clearedFiles[dir] = count;
  }

  console.log(JSON.stringify({
    deleted: before,
    clearedFiles,
    preserved: ["students", "staff", "student_accounts", "recognition_templates", "document_types", "offices", "settings"],
  }, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  console.error("[reset-scan-documents] Failed:", error.message || error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}

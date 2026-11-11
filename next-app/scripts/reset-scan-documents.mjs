import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { pool } = await import("../src/lib/postgres.js");

const { getHotFolderRoot, getLocalDataDir, getOfficeHotFolderDirs } = await import("../src/lib/officePaths.js");

const localDir = getLocalDataDir();
const hotFolderRoot = getHotFolderRoot();
const scannerDirs = [
  path.join(hotFolderRoot, "INBOUND"),
  path.join(hotFolderRoot, "DONE"),
  path.join(hotFolderRoot, "FAILED"),
  path.join(hotFolderRoot, "PROCESSING"),
  path.join(localDir, "ingest"),
];

const { getDocumentFilePath } = await import("../src/lib/documentsRepo.js");

const client = await pool.connect();
try {
  await client.query("BEGIN");
  const before = (await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM documents) AS documents,
      (SELECT COUNT(*)::int FROM ingest_queue) AS ingest_queue
  `)).rows[0];

  const { rows: offices } = await client.query("SELECT id FROM offices");
  for (const { id } of offices) {
    scannerDirs.push(...Object.values(getOfficeHotFolderDirs(id)));
  }

  const { rows: documents } = await client.query("SELECT office_id, storage_filename FROM documents");
  const documentFiles = new Set(documents.map(getDocumentFilePath).filter(Boolean));

  // Clear queue rows first because they reference promoted documents.
  await client.query("DELETE FROM ingest_queue");
  await client.query("DELETE FROM documents");
  await client.query("COMMIT");

  let clearedDocumentFiles = 0;
  for (const filename of documentFiles) {
    try {
      await fs.unlink(filename);
      clearedDocumentFiles += 1;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

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
    clearedDocumentFiles,
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

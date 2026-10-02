import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Configure next-app/.env.local first.");
}

const confirmed = process.argv.includes("--confirm");
const dataDir = path.resolve(process.env.LOCAL_DATA_DIR || ".local");
const attachmentsDir = path.resolve(dataDir, "storage", "registrar", "request_attachments");
const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();

  const [requests, attachments, feedback, updates] = await Promise.all([
    client.query("SELECT COUNT(*)::int AS count FROM document_requests"),
    client.query("SELECT storage_filename FROM document_request_attachments"),
    client.query("SELECT COUNT(*)::int AS count FROM document_request_feedback"),
    client.query("SELECT COUNT(*)::int AS count FROM transaction_updates WHERE document_request_id IS NOT NULL"),
  ]);

  const requestCount = requests.rows[0].count;
  const attachmentRows = attachments.rows;
  console.log(`Document requests: ${requestCount}`);
  console.log(`Request attachments: ${attachmentRows.length}`);
  console.log(`Request feedback entries: ${feedback.rows[0].count}`);
  console.log(`Request timeline updates: ${updates.rows[0].count}`);

  if (!confirmed) {
    console.log("Dry run only. Re-run with --confirm to delete these requests and their request-owned data.");
  } else {
    await client.query("BEGIN");
    try {
      await client.query("DELETE FROM document_requests");
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    let removedFiles = 0;
    let missingFiles = 0;
    for (const row of attachmentRows) {
      const filename = String(row.storage_filename || "");
      const filePath = path.resolve(attachmentsDir, filename);
      if (!filename || path.dirname(filePath) !== attachmentsDir) {
        console.warn(`[clear-document-requests] Skipping unsafe attachment path: ${filename || "<empty>"}`);
        continue;
      }
      try {
        await fs.unlink(filePath);
        removedFiles += 1;
      } catch (error) {
        if (error.code === "ENOENT") missingFiles += 1;
        else console.warn(`[clear-document-requests] Could not remove ${filename}: ${error.message}`);
      }
    }

    console.log(`Deleted ${requestCount} document requests. Removed ${removedFiles} attachment files; ${missingFiles} were already missing.`);
    console.log("Student/accounts, official documents, staff, OSAS event-proposal updates, and other records were preserved.");
  }
} finally {
  await client.end();
}

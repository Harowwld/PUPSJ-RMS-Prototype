import { unlink } from "node:fs/promises";
import path from "node:path";
import { query, transaction } from "./postgres.js";
import { getLocalDataDir } from "./officePaths.js";

const KEY_PREFIX = "receipt-file-cleanup:";

export function queueReceiptFileCleanup(db, filename) {
  return db.query(
    "INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (key) DO NOTHING",
    [KEY_PREFIX + filename, filename],
  );
}

export async function cleanReceiptFile(filename) {
  if (!filename || filename === "." || filename === ".." || path.basename(filename) !== filename) {
    throw new Error("Invalid receipt storage filename.");
  }

  const key = KEY_PREFIX + filename;
  try {
    await transaction(async (db) => {
      const job = await db.queryOne("SELECT key FROM settings WHERE key = $1 FOR UPDATE", [key]);
      if (!job) return;
      const reference = await db.queryOne(
        "SELECT id FROM document_request_attachments WHERE storage_filename = $1 LIMIT 1",
        [filename],
      );
      if (!reference) {
        const file = path.join(getLocalDataDir(), "storage", "registrar", "request_attachments", filename);
        await unlink(file).catch((error) => {
          if (error.code !== "ENOENT") throw error;
        });
      }
      await db.query("DELETE FROM settings WHERE key = $1", [key]);
    });
  } catch (error) {
    console.error("[receipt cleanup] Could not delete file; cleanup will retry:", filename, error);
    await query("UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE key = $1", [key]);
  }
}

export function initReceiptFileCleanup() {
  if (globalThis.receiptFileCleanupTimer || process.env.NEXT_PHASE === "phase-production-build") return;

  let running = false;
  const retryPending = async () => {
    if (running) return;
    running = true;
    try {
      const jobs = await query(
        "SELECT value FROM settings WHERE key LIKE $1 ORDER BY updated_at, key LIMIT 50",
        [KEY_PREFIX + "%"],
      );
      for (const job of jobs) await cleanReceiptFile(job.value);
    } catch (error) {
      console.error("[receipt cleanup] Could not process pending deletions:", error);
    } finally {
      running = false;
    }
  };
  globalThis.receiptFileCleanupTimer = setInterval(retryPending, 60_000);
  globalThis.receiptFileCleanupTimer.unref();
}

import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";

dotenv.config({ path: ".env" });

test("failed review rows can be retried when queue status is still pending", async () => {
  const { query, pool } = await import("../src/lib/postgres.js");
  const { resetForRetry } = await import("../src/lib/ingestQueueRepo.js");
  const marker = randomUUID();
  const officeId = "registrar";
  const insertedIds = [];

  try {
    const failedRows = await query(
      `INSERT INTO ingest_queue (office_id, original_filename, storage_filename, mime_type, size_bytes, status, ocr_status, review_status, last_error)
       VALUES ($1, $2, $3, 'application/pdf', 1, 'pending', 'failed', 'Failed', 'Vision recognition failed')
       RETURNING id`,
      [officeId, `${marker}.pdf`, `${marker}.pdf`],
    );
    const failedId = failedRows[0].id;
    insertedIds.push(failedId);

    const retried = await resetForRetry(failedId, { officeId });
    assert.equal(retried.status, "pending");
    assert.equal(retried.ocr_status, "pending");
    assert.equal(retried.review_status, "Processing");
    assert.equal(retried.last_error, null);

    // The transition above makes a second retry ineligible, even under a race.
    assert.equal(await resetForRetry(failedId, { officeId }), null);

    const processingRows = await query(
      `INSERT INTO ingest_queue (office_id, original_filename, storage_filename, mime_type, size_bytes, status, ocr_status, review_status)
       VALUES ($1, $2, $3, 'application/pdf', 1, 'pending', 'pending', 'Processing')
       RETURNING id`,
      [officeId, `${marker}-processing.pdf`, `${marker}-processing.pdf`],
    );
    const processingId = processingRows[0].id;
    insertedIds.push(processingId);
    assert.equal(await resetForRetry(processingId, { officeId }), null);
  } finally {
    if (insertedIds.length) await query("DELETE FROM ingest_queue WHERE id = ANY($1::int[])", [insertedIds]);
    await pool.end();
  }
});

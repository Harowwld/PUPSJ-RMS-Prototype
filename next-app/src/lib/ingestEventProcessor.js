import { createBatch } from "./ingestQueueRepo.js";
import { processNextBatchItem } from "./ingestBatchProcessor.js";
import { publishIngestEvent } from "./ingestEvents.js";

const officeRuns = new Map();

function normalizeOfficeId(value) {
  return String(value || "").trim().toLowerCase();
}

async function drainOffice(officeId) {
  while (true) {
    const batch = await createBatch({ officeId, sourceStation: "Ingest Event" });
    if (!batch.claimed) return;

    const item = await processNextBatchItem(batch.batchId, officeId);
    if (!item) continue;

    await publishIngestEvent({
      type: "ocr_completed",
      officeId,
      id: item.id,
      batchId: batch.batchId,
      status: item.ocr_status,
      reviewStatus: item.review_status,
    });
    console.log(`[ingest-event] Processed ingest #${item.id} for ${officeId}: ${item.review_status}`);
  }
}

export function triggerIngestProcessing(officeId, reason = "ingest event") {
  const normalizedOfficeId = normalizeOfficeId(officeId);
  if (!normalizedOfficeId) return Promise.resolve();

  const previous = officeRuns.get(normalizedOfficeId) || Promise.resolve();
  const run = previous
    .catch((error) => console.error(`[ingest-event] Previous ${normalizedOfficeId} run failed: ${error.message}`))
    .then(async () => {
      console.log(`[ingest-event] Warming OCR for ${normalizedOfficeId} (${reason})`);
      await drainOffice(normalizedOfficeId);
    })
    .catch((error) => {
      console.error(`[ingest-event] OCR trigger failed for ${normalizedOfficeId}: ${error.message}`);
    });

  officeRuns.set(normalizedOfficeId, run);
  return run.finally(() => {
    if (officeRuns.get(normalizedOfficeId) === run) officeRuns.delete(normalizedOfficeId);
  });
}

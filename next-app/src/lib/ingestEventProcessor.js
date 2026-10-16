import { autoRetryFailedIngests, createBatch, getIngestProcessingPaused } from "./ingestQueueRepo.js";
import { processNextBatchItem } from "./ingestBatchProcessor.js";
import { publishIngestEvent } from "./ingestEvents.js";

const officeRuns = new Map();

function normalizeOfficeId(value) {
  return String(value || "").trim().toLowerCase();
}

async function drainOffice(officeId) {
  while (true) {
    while (true) {
      if (await getIngestProcessingPaused(officeId)) return;
      const batch = await createBatch({ officeId, sourceStation: "Ingest Event" });
      if (!batch.claimed) break;

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

    if (await getIngestProcessingPaused(officeId)) return;
    const retryItems = await autoRetryFailedIngests(officeId);
    if (!retryItems.length) return;

    for (const retryItem of retryItems) {
      await publishIngestEvent({
        type: "ocr_auto_retry_queued",
        officeId,
        id: retryItem.id,
        batchId: retryItem.batch_id,
        status: "pending",
        reviewStatus: "Processing",
      });
    }
    console.log(`[ingest-event] Retrying ${retryItems.length} failed ingest item(s) for ${officeId} after the queue drained.`);
  }
}

export function triggerIngestProcessing(officeId, reason = "ingest event") {
  const normalizedOfficeId = normalizeOfficeId(officeId);
  if (!normalizedOfficeId) return Promise.resolve();

  const previous = officeRuns.get(normalizedOfficeId) || Promise.resolve();
  const run = previous
    .catch((error) => console.error(`[ingest-event] Previous ${normalizedOfficeId} run failed: ${error.message}`))
    .then(async () => {
      console.log(`[ingest-event] Processing ${normalizedOfficeId} ingest queue (${reason})`);
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

export function warmRegistrarIngestQueueOnLogin(staff) {
  const officeId = String(staff?.office_id || staff?.officeId || "").trim().toLowerCase();
  const legacySection = String(staff?.section || "").trim().toLowerCase();
  const isRegistrar = officeId ? officeId === "registrar" : ["administrative", "records"].includes(legacySection);

  if (isRegistrar) {
    void triggerIngestProcessing("registrar", "registrar account login");
  }
}

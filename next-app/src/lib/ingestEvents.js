import { pool } from "./postgres.js";

export const INGEST_EVENT_CHANNEL = "pupsj_ingest_events";

export function isIngestEventForOffice(event, officeId) {
  return String(event?.officeId || "").trim().toLowerCase() === String(officeId || "").trim().toLowerCase();
}

export async function publishIngestEvent(event) {
  const payload = JSON.stringify({
    type: String(event?.type || "ingest_changed"),
    officeId: event?.officeId ? String(event.officeId).trim().toLowerCase() : null,
    id: event?.id == null ? null : Number(event.id),
    batchId: event?.batchId ? String(event.batchId) : null,
    status: event?.status ? String(event.status) : null,
    reviewStatus: event?.reviewStatus ? String(event.reviewStatus) : null,
    occurredAt: new Date().toISOString(),
  });

  try {
    await pool.query("SELECT pg_notify($1, $2)", [INGEST_EVENT_CHANNEL, payload]);
  } catch (error) {
    console.warn(`[ingest-events] Could not publish event: ${error.message}`);
  }
}

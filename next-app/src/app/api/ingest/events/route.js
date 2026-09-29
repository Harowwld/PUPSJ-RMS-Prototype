import { Client } from "pg";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../lib/authHelpers";
import { INGEST_EVENT_CHANNEL, isIngestEventForOffice } from "../../../../lib/ingestEvents";

export const runtime = "nodejs";

function encodeEvent(eventName, payload) {
  return `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");

  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  if (!process.env.DATABASE_URL) return createAuthErrorResponse("Database connection is required", 503);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`LISTEN ${INGEST_EVENT_CHANNEL}`);

  let closed = false;
  let canceled = false;
  let heartbeatTimer;
  let streamController;
  let cleanupConnection;
  let cleanupPromise;
  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      const send = (eventName, payload) => {
        if (closed) return;
        controller.enqueue(new TextEncoder().encode(encodeEvent(eventName, payload)));
      };

      const cleanup = ({ closeStream = false } = {}) => {
        if (cleanupPromise) return cleanupPromise;
        closed = true;
        clearInterval(heartbeatTimer);
        req.signal.removeEventListener("abort", onAbort);
        cleanupPromise = (async () => {
          client.removeAllListeners("notification");
          await client.query(`UNLISTEN ${INGEST_EVENT_CHANNEL}`).catch(() => {});
          await client.end().catch(() => {});
          if (closeStream && !canceled && !req.signal.aborted) {
            streamController.close();
          }
        })();
        return cleanupPromise;
      };
      cleanupConnection = cleanup;
      const onAbort = () => cleanup();

      client.on("notification", (message) => {
        let payload;
        try {
          payload = JSON.parse(message.payload || "{}");
        } catch {
          return;
        }
        if (!isIngestEventForOffice(payload, officeId)) return;
        send("ingest", payload);
      });

      client.on("error", (connectionError) => {
        if (!closed) console.warn(`[ingest-events] SSE listener error: ${connectionError.message}`);
        cleanup({ closeStream: true });
      });

      send("ready", { officeId, occurredAt: new Date().toISOString() });
      heartbeatTimer = setInterval(() => send("heartbeat", { occurredAt: new Date().toISOString() }), 20000);
      req.signal.addEventListener("abort", onAbort, { once: true });
    },
    cancel() {
      canceled = true;
      return cleanupConnection?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

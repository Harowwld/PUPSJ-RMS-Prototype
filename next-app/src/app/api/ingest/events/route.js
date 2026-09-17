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
  let heartbeatTimer;
  let closeConnection;
  const stream = new ReadableStream({
    start(controller) {
      const send = (eventName, payload) => {
        if (closed) return;
        controller.enqueue(new TextEncoder().encode(encodeEvent(eventName, payload)));
      };

      const close = async () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeatTimer);
        client.removeAllListeners("notification");
        await client.query(`UNLISTEN ${INGEST_EVENT_CHANNEL}`).catch(() => {});
        await client.end().catch(() => {});
        controller.close();
      };
      closeConnection = close;

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
        close();
      });

      send("ready", { officeId, occurredAt: new Date().toISOString() });
      heartbeatTimer = setInterval(() => send("heartbeat", { occurredAt: new Date().toISOString() }), 20000);
      req.signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      return closeConnection?.();
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

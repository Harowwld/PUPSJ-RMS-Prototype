import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../lib/authHelpers";
import { getIngestProcessingPaused, setIngestProcessingPaused } from "../../../../lib/ingestQueueRepo";
import { publishIngestEvent } from "@/lib/ingestEvents";
import { triggerIngestProcessing } from "@/lib/ingestEventProcessor";
import { writeAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);

  const body = await req.json().catch(() => null);
  if (typeof body?.paused !== "boolean") {
    return NextResponse.json({ ok: false, error: "paused must be a boolean" }, { status: 400 });
  }

  try {
    const paused = await setIngestProcessingPaused(officeId, body.paused);
    await publishIngestEvent({
      type: paused ? "ocr_paused" : "ocr_resumed",
      officeId,
      status: paused ? "paused" : "running",
    });
    await writeAuditLog(req, paused ? "Continuous scanning paused" : "Continuous scanning resumed", {
      details: paused
        ? "OCR queue processing paused; incoming scans remain queued."
        : "OCR queue processing resumed.",
      entity_type: "ingest_queue",
    });
    if (!paused) void triggerIngestProcessing(officeId, "scanning resumed");

    return NextResponse.json({ ok: true, data: { paused: await getIngestProcessingPaused(officeId) } });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause?.message || "Could not update scanning state" }, { status: 500 });
  }
}

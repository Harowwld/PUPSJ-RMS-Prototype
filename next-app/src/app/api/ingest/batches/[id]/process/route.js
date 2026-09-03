import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse } from "../../../../../../lib/authHelpers";
import { getBatch } from "../../../../../../lib/ingestQueueRepo";
import { processNextBatchItem } from "../../../../../../lib/ingestBatchProcessor";
import { writeAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "Invalid batch id" }, { status: 400 });
  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit) || 1, 1), 10);
    const items = [];
    for (let index = 0; index < limit; index += 1) {
      const item = await processNextBatchItem(id, user.office_id || "registrar");
      if (!item) break;
      items.push(item);
    }
    if (items.length) {
      await writeAuditLog(req, "Batch OCR processing", { details: `Processed ${items.length} item(s) in batch ${id}.`, entity_type: "ingest_batch", entity_id: id });
    }
    return NextResponse.json({ ok: true, data: { processed: items.length, items, batch: await getBatch(id, user.office_id || "registrar") } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message || "Batch processing failed" }, { status: 500 });
  }
}

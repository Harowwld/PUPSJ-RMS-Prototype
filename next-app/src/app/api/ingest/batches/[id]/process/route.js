import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../../../lib/authHelpers";
import { getBatch } from "../../../../../../lib/ingestQueueRepo";
import { processNextBatchItem } from "../../../../../../lib/ingestBatchProcessor";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";

export async function POST(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "Invalid batch id" }, { status: 400 });
  try {
    const existingBatch = await getBatch(id, officeId);
    if (!existingBatch || (existingBatch.rows || []).some((row) => !canAccessResource(user, "ingest", row))) {
      return NextResponse.json({ ok: false, error: "Batch not found" }, { status: 404 });
    }
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit) || 1, 1), 10);
    const items = [];
    for (let index = 0; index < limit; index += 1) {
      const item = await processNextBatchItem(id, officeId);
      if (!item) break;
      items.push(item);
    }
    if (items.length) {
      await writeAuditLog(req, "Batch OCR processing", { details: `Processed ${items.length} item(s) in batch ${id}.`, entity_type: "ingest_batch", entity_id: id });
    }
    const batch = await getBatch(id, officeId);
    if ((items || []).some((item) => !canAccessResource(user, "ingest", item)) || (batch?.rows || []).some((row) => !canAccessResource(user, "ingest", row))) {
      return NextResponse.json({ ok: false, error: "Batch not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: { processed: items.length, items, batch } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Batch processing failed" }, { status: 500 });
  }
}

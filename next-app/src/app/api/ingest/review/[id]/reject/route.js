import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../../../lib/authHelpers";
import { getIngestById, rejectIngest } from "../../../../../../lib/ingestQueueRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { publishIngestEvent } from "@/lib/ingestEvents";

export const runtime = "nodejs";

export async function POST(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const rawId = (await ctx.params).id;
  const id = Number(rawId);
  if (!/^\d+$/.test(String(rawId || "")) || !Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }
  const item = await getIngestById(id, { officeId });
  if (!item || !canAccessResource(user, "ingest", item)) return NextResponse.json({ ok: false, error: "Review item not found" }, { status: 404 });
  if (item.status === "promoted") return NextResponse.json({ ok: false, error: "Promoted items cannot be rejected." }, { status: 409 });
  const rawBody = await req.text();
  let body = {};
  if (rawBody.trim()) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
  if (Object.keys(body).some((field) => field !== "reason")) {
    return NextResponse.json({ ok: false, error: "Only reason is supported" }, { status: 400 });
  }
  if (body.reason !== undefined && typeof body.reason !== "string") {
    return NextResponse.json({ ok: false, error: "Reason must be text" }, { status: 400 });
  }
  if (item.status === "rejected") return NextResponse.json({ ok: true, data: item, idempotent: true });
  const data = await rejectIngest(id, body.reason, user.id, { officeId });
  if (!data) return NextResponse.json({ ok: false, error: "Review item is no longer available for rejection." }, { status: 409 });
  await publishIngestEvent({
    type: "ocr_review_rejected",
    officeId,
    id,
    batchId: data?.batch_id,
    status: data?.status,
    reviewStatus: data?.review_status,
  });
  await writeAuditLog(req, "Batch review item rejected", { details: `Rejected ingest item #${id}.`, entity_type: "ingest_item", entity_id: id });
  return NextResponse.json({ ok: true, data });
}

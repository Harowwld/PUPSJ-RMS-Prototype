import fs from "node:fs";
import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../../lib/authHelpers";
import { getIngestById, getIngestFilePath, rejectIngest, updateReview } from "../../../../../lib/ingestQueueRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { publishIngestEvent } from "@/lib/ingestEvents";

export const runtime = "nodejs";

export async function PATCH(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  const existing = await getIngestById(id, { officeId });
  if (!existing || !canAccessResource(user, "ingest", existing)) return NextResponse.json({ ok: false, error: "Review item not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  const data = await updateReview(id, body, user.id, { officeId });
  await writeAuditLog(req, "Batch review item edited", { details: `Edited ingest item #${id}.`, entity_type: "ingest_item", entity_id: id });
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  const existing = await getIngestById(id, { officeId });
  if (!existing || !canAccessResource(user, "ingest", existing)) return NextResponse.json({ ok: false, error: "Review item not found" }, { status: 404 });

  try {
    const filePath = getIngestFilePath(existing.storage_filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}

  const data = await rejectIngest(id, "Dismissed from review queue", user.id, { officeId });
  await publishIngestEvent({
    type: "ocr_review_rejected",
    officeId,
    id,
    batchId: data?.batch_id,
    status: data?.status,
    reviewStatus: data?.review_status,
  });
  await writeAuditLog(req, "Batch review item rejected", { details: `Dismissed/deleted ingest item #${id}.`, entity_type: "ingest_item", entity_id: id });
  return NextResponse.json({ ok: true, data });
}

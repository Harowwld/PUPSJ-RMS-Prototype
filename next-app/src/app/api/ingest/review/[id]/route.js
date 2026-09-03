import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse } from "../../../../../lib/authHelpers";
import { getIngestById, updateReview } from "../../../../../lib/ingestQueueRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function PATCH(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  const existing = await getIngestById(id);
  if (!existing || (existing.office_id && existing.office_id !== (user.office_id || "registrar"))) return NextResponse.json({ ok: false, error: "Review item not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  const data = await updateReview(id, body, user.id);
  await writeAuditLog(req, "Batch review item edited", { details: `Edited ingest item #${id}.`, entity_type: "ingest_item", entity_id: id });
  return NextResponse.json({ ok: true, data });
}

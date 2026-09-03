import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse } from "../../../../../../lib/authHelpers";
import { getIngestById, rejectIngest } from "../../../../../../lib/ingestQueueRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const id = Number((await ctx.params).id);
  const item = await getIngestById(id);
  if (!item || (item.office_id && item.office_id !== (user.office_id || "registrar"))) return NextResponse.json({ ok: false, error: "Review item not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const data = await rejectIngest(id, body.reason, user.id);
  await writeAuditLog(req, "Batch review item rejected", { details: `Rejected ingest item #${id}.`, entity_type: "ingest_item", entity_id: id });
  return NextResponse.json({ ok: true, data });
}

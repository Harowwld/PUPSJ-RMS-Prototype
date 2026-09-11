import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../../../lib/authHelpers";
import { getIngestById, resetForRetry } from "../../../../../../lib/ingestQueueRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";

export async function POST(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const id = Number((await ctx.params).id);
  const item = await getIngestById(id, { officeId });
  if (!item || !canAccessResource(user, "ingest", item)) return NextResponse.json({ ok: false, error: "Review item not found" }, { status: 404 });
  const data = await resetForRetry(id, { officeId });
  await writeAuditLog(req, "Batch review item retry", { details: `Reset ingest item #${id} for OCR retry.`, entity_type: "ingest_item", entity_id: id });
  return NextResponse.json({ ok: true, data });
}

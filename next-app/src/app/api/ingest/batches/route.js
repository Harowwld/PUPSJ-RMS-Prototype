import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../lib/authHelpers";
import { createBatch } from "../../../../lib/ingestQueueRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";

export async function POST(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  try {
    const body = await req.json().catch(() => ({}));
    const data = await createBatch({ officeId, sourceStation: body.sourceStation || null });
    if (!data || (data.rows || []).some((row) => !canAccessResource(user, "ingest", row))) {
      return NextResponse.json({ ok: false, error: "Batch not found" }, { status: 404 });
    }
    await writeAuditLog(req, "Batch scanning started", { details: `Started batch ${data.batchId} with ${data.claimed} item(s).`, entity_type: "ingest_batch", entity_id: data.batchId });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Unable to start batch" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { createBatch } from "../../../../lib/ingestQueueRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  try {
    const body = await req.json().catch(() => ({}));
    const data = await createBatch({ officeId: user.office_id || "registrar", sourceStation: body.sourceStation || null });
    await writeAuditLog(req, "Batch scanning started", { details: `Started batch ${data.batchId} with ${data.claimed} item(s).`, entity_type: "ingest_batch", entity_id: data.batchId });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message || "Unable to start batch" }, { status: 500 });
  }
}

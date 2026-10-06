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
    const unsupportedField = Object.keys(body).find((field) => field !== "sourceStation");
    if (unsupportedField) {
      return NextResponse.json({ ok: false, error: `Unsupported field: ${unsupportedField}` }, { status: 400 });
    }
    if (body.sourceStation !== undefined && typeof body.sourceStation !== "string") {
      return NextResponse.json({ ok: false, error: "sourceStation must be text" }, { status: 400 });
    }
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

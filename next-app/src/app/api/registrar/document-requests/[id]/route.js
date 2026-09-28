import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/postgres";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { canTransitionRequestStatus, DEFAULT_REQUEST_STATUS_MESSAGES } from "@/lib/constants";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";
const statuses = new Set(["Pending", "InProgress", "Ready", "Completed", "Cancelled", "Shredded"]);

export async function PATCH(req, ctx) {
  const access = await requireOfficeModule("document_requests", { officeId: "registrar" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const status = String(body?.status || "").trim();
  const rawMessage = String(body?.message || "").trim();
  if (!statuses.has(status)) return NextResponse.json({ ok: false, error: "A valid status is required." }, { status: 400 });
  const existing = await queryOne("SELECT * FROM document_requests WHERE id = $1 AND office_id = 'registrar'", [id]);
  if (!existing || !canAccessResource(access, "request", existing)) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (existing.status && existing.status !== status && !canTransitionRequestStatus(existing.status, status)) {
    return NextResponse.json({ ok: false, error: `Cannot change status from "${existing.status}" to "${status}". Completed and finalized requests cannot be reverted.` }, { status: 400 });
  }

  const statusChanged = existing.status !== status;
  const finalMessage = rawMessage || (statusChanged ? (DEFAULT_REQUEST_STATUS_MESSAGES[status] || `Status updated to ${status}.`) : "");

  if (!statusChanged && !rawMessage) {
    return NextResponse.json({ ok: true, data: existing });
  }

  const updated = await queryOne(
    "UPDATE document_requests SET status = $1, notes = COALESCE(NULLIF($2, ''), notes), updated_at = NOW(), updated_by = $3 WHERE id = $4 AND office_id = 'registrar' RETURNING *",
    [status, rawMessage || null, access.userId || null, id]
  );
  if (!updated) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!canAccessResource(access, "request", updated)) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (finalMessage) {
    const latestUpdate = await queryOne(
      "SELECT status, message FROM transaction_updates WHERE document_request_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1",
      [id]
    );
    const isDuplicate = latestUpdate && latestUpdate.status === status && latestUpdate.message === finalMessage;
    if (!isDuplicate) {
      await query(
        "INSERT INTO transaction_updates (document_request_id, status, message, created_by) VALUES ($1, $2, $3, $4)",
        [id, status, finalMessage, access.userId || null]
      );
    }
  }

  await writeGlobalAuditLog(req, "Updated Registrar document request", {
    officeId: "registrar",
    details: `Changed request ${id} to ${status}.${finalMessage ? ` Update: "${finalMessage}"` : ""}`,
    entity_type: "document_request",
    entity_id: String(id),
  });
  return NextResponse.json({ ok: true, data: updated });
}

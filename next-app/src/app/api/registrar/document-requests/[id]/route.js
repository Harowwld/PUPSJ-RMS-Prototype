import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/postgres";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { canTransitionRequestStatus } from "@/lib/constants";
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
  const message = String(body?.message || "").trim();
  if (!statuses.has(status) || !message) return NextResponse.json({ ok: false, error: "A valid status and student-visible update are required." }, { status: 400 });
  const existing = await queryOne("SELECT * FROM document_requests WHERE id = $1 AND office_id = 'registrar'", [id]);
  if (!existing || !canAccessResource(access, "request", existing)) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (existing.status && existing.status !== status && !canTransitionRequestStatus(existing.status, status)) {
    return NextResponse.json({ ok: false, error: `Cannot change status from "${existing.status}" to "${status}". Completed and finalized requests cannot be reverted.` }, { status: 400 });
  }

  const updated = await queryOne("UPDATE document_requests SET status = $1, notes = $2, updated_at = NOW(), updated_by = $3 WHERE id = $4 AND office_id = 'registrar' RETURNING *", [status, message, access.userId || null, id]);
  if (!updated) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!canAccessResource(access, "request", updated)) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  await query("INSERT INTO transaction_updates (document_request_id, status, message, created_by) VALUES ($1, $2, $3, $4)", [id, status, message, access.userId || null]);
  await writeGlobalAuditLog(req, "Updated Registrar document request", {
    officeId: "registrar",
    details: `Changed request ${id} to ${status}. Update: "${message}"`,
    entity_type: "document_request",
    entity_id: String(id),
  });
  return NextResponse.json({ ok: true, data: updated });
}

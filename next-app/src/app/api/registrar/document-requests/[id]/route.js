import { NextResponse } from "next/server";
import { transaction } from "@/lib/postgres";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { canTransitionRequestStatus, DEFAULT_REQUEST_STATUS_MESSAGES } from "@/lib/constants";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";
const statuses = new Set(["Pending", "Deficient", "PendingPayment", "InProgress", "Ready", "Completed", "Cancelled", "Shredded"]);

export async function PATCH(req, ctx) {
  const access = await requireOfficeModule("document_requests", { officeId: "registrar" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const requestId = Number(id);
  if (!Number.isSafeInteger(requestId) || requestId < 1) return NextResponse.json({ ok: false, error: "Invalid request ID" }, { status: 400 });
  const body = await req.json().catch(() => null);
  const status = body?.status === undefined ? null : String(body.status || "").trim();
  const rawMessage = String(body?.message || "").trim();
  const hasSpaVerified = body?.spaVerified !== undefined;
  const spaVerified = Boolean(body?.spaVerified);

  if (status !== null && !statuses.has(status)) return NextResponse.json({ ok: false, error: "Invalid status." }, { status: 400 });
  if (status === null && !hasSpaVerified) return NextResponse.json({ ok: false, error: "A valid status or update is required." }, { status: 400 });
  if (hasSpaVerified && typeof body.spaVerified !== "boolean") return NextResponse.json({ ok: false, error: "spaVerified must be a boolean." }, { status: 400 });

  const outcome = await transaction(async ({ query, queryOne }) => {
    const existing = await queryOne(
      "SELECT * FROM document_requests WHERE id = $1 AND office_id = 'registrar' FOR UPDATE",
      [requestId]
    );
    if (!existing || !canAccessResource(access, "request", existing)) return { error: "Not found", status: 404 };

    const nextStatus = status ?? existing.status;
    if (nextStatus === "Deficient" && !rawMessage) {
      return { error: "Add a comment explaining what the student needs to provide.", status: 400 };
    }
    if (existing.status && existing.status !== nextStatus && !canTransitionRequestStatus(existing.status, nextStatus)) {
      return { error: `Cannot change status from "${existing.status}" to "${nextStatus}". Completed and finalized requests cannot be reverted.`, status: 400 };
    }

    const statusChanged = existing.status !== nextStatus;
    const defaultMsg = hasSpaVerified
      ? (spaVerified ? "Special Power of Attorney (SPA) and identity verified by Registrar." : "Special Power of Attorney (SPA) verification revoked.")
      : (statusChanged ? (DEFAULT_REQUEST_STATUS_MESSAGES[nextStatus] || `Status updated to ${nextStatus}.`) : "");
    const finalMessage = rawMessage || defaultMsg;
    if (!statusChanged && !rawMessage && !hasSpaVerified) return { data: existing, changed: false };

    const updated = await queryOne(
      `UPDATE document_requests
       SET status = $1,
           notes = COALESCE(NULLIF($2, ''), notes),
           spa_verified = CASE WHEN $3::boolean IS NOT NULL THEN $3 ELSE spa_verified END,
           spa_verified_by = CASE WHEN $3::boolean IS NOT NULL THEN (CASE WHEN $3 THEN $4 ELSE NULL END) ELSE spa_verified_by END,
           spa_verified_at = CASE WHEN $3::boolean IS NOT NULL THEN (CASE WHEN $3 THEN NOW() ELSE NULL END) ELSE spa_verified_at END,
           updated_at = NOW(),
           updated_by = $4
       WHERE id = $5 AND office_id = 'registrar' RETURNING *`,
      [nextStatus, rawMessage || null, hasSpaVerified ? spaVerified : null, access.userId || null, requestId]
    );
    if (!updated || !canAccessResource(access, "request", updated)) return { error: "Not found", status: 404 };

    if (finalMessage) {
      const latestUpdate = await queryOne(
        "SELECT status, message FROM transaction_updates WHERE document_request_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1",
        [requestId]
      );
      const isDuplicate = latestUpdate && latestUpdate.status === nextStatus && latestUpdate.message === finalMessage;
      if (!isDuplicate) {
        await query(
          "INSERT INTO transaction_updates (document_request_id, status, message, created_by) VALUES ($1, $2, $3, $4)",
          [requestId, nextStatus, finalMessage, access.userId || null]
        );
      }
    }
    return { data: updated, changed: true, nextStatus, finalMessage };
  });

  if (outcome.error) return NextResponse.json({ ok: false, error: outcome.error }, { status: outcome.status });
  if (!outcome.changed) return NextResponse.json({ ok: true, data: outcome.data });

  await writeGlobalAuditLog(req, "Updated Registrar document request", {
    officeId: "registrar",
    details: `Changed request ${requestId} to ${outcome.nextStatus}.${outcome.finalMessage ? ` Update: "${outcome.finalMessage}"` : ""}`,
    entity_type: "document_request",
    entity_id: String(requestId),
  });
  return NextResponse.json({ ok: true, data: outcome.data });
}

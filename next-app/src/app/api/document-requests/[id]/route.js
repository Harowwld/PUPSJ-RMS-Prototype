import { NextResponse } from "next/server";

import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { isSystemAdminRole } from "../../../../lib/roleUtils";
import {
  getDocumentRequestById,
  updateDocumentRequest,
  isValidRequestStatus,
} from "../../../../lib/documentRequestsRepo";
import { canTransitionRequestStatus } from "../../../../lib/constants";
import { getDocumentById } from "../../../../lib/documentsRepo";
import { requireStaff, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { canAccessResource } from "../../../../lib/resourceAuthorization";

export const runtime = "nodejs";

function parseRequestId(rawId) {
  const value = String(rawId ?? "");
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(req, ctx) {
  const access = await requireStaff(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Staff authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  const staff = access.user;
  const officeId = isSystemAdminRole(staff.role) ? "" : staff.officeId;
  if (!isSystemAdminRole(staff.role) && !officeId) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const params = await ctx.params;
  const id = parseRequestId(params?.id);
  if (id === null) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const row = await getDocumentRequestById(id, { officeId });
  if (!row || !canAccessResource(staff, "request", row)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  await writeAuditLog(req, "Viewed Document Request", {
    details: `Viewed document request #${id}.`,
    entity_type: "document_request",
    entity_id: String(id),
  });

  return NextResponse.json({ ok: true, data: row });
}

export async function PATCH(req, ctx) {
  const access = await requireStaff(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Staff authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  const staff = access.user;
  const officeId = isSystemAdminRole(staff.role) ? "" : staff.officeId;
  if (!isSystemAdminRole(staff.role) && !officeId) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const params = await ctx.params;
  const id = parseRequestId(params?.id);
  if (id === null) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const existing = await getDocumentRequestById(id, { officeId });
  if (!existing || !canAccessResource(staff, "request", existing)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (body.spaVerified !== undefined && typeof body.spaVerified !== "boolean") {
    return NextResponse.json({ ok: false, error: "spaVerified must be a boolean." }, { status: 400 });
  }

  const patch = { updatedBy: staff.id, officeId };

  if (body.status !== undefined) {
    const s = String(body.status || "");
    if (!isValidRequestStatus(s)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status" },
        { status: 400 }
      );
    }
    if (existing.status && existing.status !== s && !canTransitionRequestStatus(existing.status, s)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot change status from "${existing.status}" to "${s}". Completed and finalized requests cannot be reverted.`,
        },
        { status: 400 }
      );
    }
    if (s === "Deficient" && !String(body.message || "").trim()) {
      return NextResponse.json({ ok: false, error: "Add a comment explaining what the student needs to provide." }, { status: 400 });
    }
    patch.status = s;
  }

  if (body.notes !== undefined) {
    patch.notes = body.notes === null ? null : String(body.notes);
  }

  if (body.message !== undefined && String(body.message).trim()) {
    patch.message = String(body.message).trim();
  }

  if (body.courseCode !== undefined) {
    patch.courseCode = body.courseCode ? String(body.courseCode).trim().toUpperCase() : null;
  }

  if (body.linkedDocumentId !== undefined) {
    const lid = body.linkedDocumentId;
    if (lid === null || lid === "") {
      patch.linkedDocumentId = null;
    } else {
      const docId = Number(lid);
      if (!Number.isFinite(docId)) {
        return NextResponse.json(
          { ok: false, error: "Invalid linkedDocumentId" },
          { status: 400 }
        );
      }
      const doc = await getDocumentById(docId, { officeId });
      if (!doc) {
        return NextResponse.json(
          { ok: false, error: "Linked document not found" },
          { status: 400 }
        );
      }
      if (existing.student_no && String(doc.student_no) !== String(existing.student_no)) {
        return NextResponse.json(
          { ok: false, error: "Document does not belong to this student" },
          { status: 400 }
        );
      }
      patch.linkedDocumentId = docId;
    }
  }

  if (body.spaVerified !== undefined) {
    patch.spaVerified = body.spaVerified;
    patch.spaVerifiedBy = staff.id;
    if (!patch.message) {
      patch.message = patch.spaVerified
        ? "Special Power of Attorney (SPA) and authorization documents verified by Registrar Staff."
        : "Special Power of Attorney (SPA) verification status revoked.";
    }
  }

  const hasFieldUpdates =
    patch.status !== undefined ||
    patch.notes !== undefined ||
    patch.linkedDocumentId !== undefined ||
    patch.message !== undefined ||
    patch.courseCode !== undefined ||
    patch.spaVerified !== undefined;

  if (!hasFieldUpdates) {
    return NextResponse.json({ ok: true, data: existing });
  }

  const row = await updateDocumentRequest(id, patch);
  if (!row) {
    return NextResponse.json(
      { ok: false, error: "Update failed" },
      { status: 400 }
    );
  }

  const parts = [];
  if (patch.status !== undefined) parts.push(`status → ${patch.status}`);
  if (patch.message !== undefined) parts.push(`update posted: "${patch.message}"`);
  if (patch.linkedDocumentId !== undefined)
    parts.push(`linked document ${patch.linkedDocumentId ?? "cleared"}`);
  await writeAuditLog(
    req,
    `Updated document request #${id}${parts.length ? ` (${parts.join(", ")})` : ""}`
  );

  return NextResponse.json({ ok: true, data: row });
}

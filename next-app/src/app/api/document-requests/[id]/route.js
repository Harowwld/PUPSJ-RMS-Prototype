import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { getStaffById } from "../../../../lib/staffRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import {
  getDocumentRequestById,
  updateDocumentRequest,
  isValidRequestStatus,
} from "../../../../lib/documentRequestsRepo";
import { getDocumentById } from "../../../../lib/documentsRepo";

export const runtime = "nodejs";

async function getSessionStaff() {
  const cookieName = getSessionCookieName();
  const store = await cookies();
  const token = store.get(cookieName)?.value || "";
  if (!token) return null;
  try {
    const payload = await verifySessionToken(token);
    const userId = String(payload?.sub || "").trim();
    if (!userId) return null;
    return await getStaffById(userId);
  } catch {
    return null;
  }
}

function isActiveStaff(staff) {
  return staff && String(staff.status || "").toLowerCase() === "active";
}

export async function GET(_req, ctx) {
  const staff = await getSessionStaff();
  if (!staff || !isActiveStaff(staff)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const id = parseInt(String(params?.id || ""), 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const row = await getDocumentRequestById(id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: row });
}

export async function PATCH(req, ctx) {
  const staff = await getSessionStaff();
  if (!staff || !isActiveStaff(staff)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const id = parseInt(String(params?.id || ""), 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const existing = await getDocumentRequestById(id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const patch = { updatedBy: staff.id };

  if (body.status !== undefined) {
    const s = String(body.status || "");
    if (!isValidRequestStatus(s)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status" },
        { status: 400 }
      );
    }
    patch.status = s;
  }

  if (body.notes !== undefined) {
    patch.notes = body.notes === null ? null : String(body.notes);
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
      const doc = await getDocumentById(docId);
      if (!doc) {
        return NextResponse.json(
          { ok: false, error: "Linked document not found" },
          { status: 400 }
        );
      }
      if (String(doc.student_no) !== String(existing.student_no)) {
        return NextResponse.json(
          { ok: false, error: "Document does not belong to this student" },
          { status: 400 }
        );
      }
      patch.linkedDocumentId = docId;
    }
  }

  const hasFieldUpdates =
    patch.status !== undefined ||
    patch.notes !== undefined ||
    patch.linkedDocumentId !== undefined;

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
  if (patch.linkedDocumentId !== undefined)
    parts.push(`linked document ${patch.linkedDocumentId ?? "cleared"}`);
  await writeAuditLog(
    req,
    `Updated document request #${id}${parts.length ? ` (${parts.join(", ")})` : ""}`
  );

  return NextResponse.json({ ok: true, data: row });
}

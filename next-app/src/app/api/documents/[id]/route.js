import fs from "node:fs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  declineDocumentAndRemoveFile,
  deleteDocument,
  getDocumentById,
  getDocumentFilePath,
  reviewDocument,
  updateDocumentMetadata,
} from "../../../../lib/documentsRepo";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { getStaffById } from "../../../../lib/staffRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

export const runtime = "nodejs";

async function getSessionStaff() {
  const cookieName = getSessionCookieName();
  const store = await cookies();
  const token = store.get(cookieName)?.value || "";
  if (!token) return null;
  const payload = await verifySessionToken(token);
  const userId = String(payload?.sub || "").trim();
  if (!userId) return null;
  return await getStaffById(userId);
}

export async function GET(_req, ctx) {
  const params = await ctx.params;
  const raw = params.id;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json(
      { ok: false, error: `Invalid id: ${raw}` },
      { status: 400 }
    );
  }

  const row = await getDocumentById(id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const filePath = getDocumentFilePath(row);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { ok: false, error: "File missing on disk" },
      { status: 404 }
    );
  }

  const bytes = fs.readFileSync(filePath);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": row.mime_type || "application/pdf",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename=\"${row.original_filename}\"`,
    },
  });
}

export async function PATCH(req, ctx) {
  const params = await ctx.params;
  const raw = params.id;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json(
      { ok: false, error: `Invalid id: ${raw}` },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const studentNo =
    body.studentNo === undefined ? undefined : String(body.studentNo).trim();
  const studentName =
    body.studentName === undefined ? undefined : String(body.studentName).trim();
  const docType = body.docType === undefined ? undefined : String(body.docType).trim();
  const approvalStatus =
    body.approvalStatus === undefined ? undefined : String(body.approvalStatus).trim();
  const reviewNote =
    body.reviewNote === undefined ? undefined : String(body.reviewNote).trim();

  if (approvalStatus !== undefined) {
    if (!["Pending", "Approved", "Declined"].includes(approvalStatus)) {
      return NextResponse.json(
        { ok: false, error: "Invalid approvalStatus" },
        { status: 400 }
      );
    }

    let reviewer = null;
    try {
      reviewer = await getSessionStaff();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }
    const role = String(reviewer?.role || "").toLowerCase();
    if (!reviewer || !["admin", "administrator", "superadmin"].includes(role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (approvalStatus === "Declined") {
      const declined = await declineDocumentAndRemoveFile(id, {
        reviewedBy: reviewer.id || reviewer.email || "admin",
        reviewNote: reviewNote || null,
      });
      if (!declined) {
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      }
      const noteText = reviewNote ? ` | reason: ${reviewNote}` : "";
      await writeAuditLog(req, `Declined document and removed file #${id}${noteText}`);
      return NextResponse.json({
        ok: true,
        data: declined,
      });
    }

    const row = await reviewDocument(id, {
      approvalStatus,
      reviewedBy: reviewer.id || reviewer.email || "admin",
      reviewNote: reviewNote || null,
    });
    if (!row) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    await writeAuditLog(req, `Reviewed document #${id}: ${approvalStatus}`);
    return NextResponse.json({ ok: true, data: row });
  }

  const row = await updateDocumentMetadata(id, { studentNo, studentName, docType });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await writeAuditLog(req, `Updated document metadata #${id}`);

  return NextResponse.json({ ok: true, data: row });
}

export async function DELETE(_req, ctx) {
  const params = await ctx.params;
  const raw = params.id;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json(
      { ok: false, error: `Invalid id: ${raw}` },
      { status: 400 }
    );
  }

  const row = await deleteDocument(id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await writeAuditLog(_req, `Deleted document #${id}`);

  return NextResponse.json({ ok: true, data: row });
}

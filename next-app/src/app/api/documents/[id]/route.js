import fs from "node:fs";
import { NextResponse } from "next/server";
import {
  declineDocumentAndRemoveFile,
  deleteDocument,
  getDocumentById,
  getDocumentFilePath,
  replaceDocumentFile,
  reviewDocument,
  updateDocumentMetadata,
} from "../../../../lib/documentsRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../lib/roleUtils";
import { canAccessResource } from "../../../../lib/resourceAuthorization";

export const runtime = "nodejs";

function canAccessDocument(user, row) {
  return canAccessResource(user, "document", row);
}

async function requireDocumentAccess(req, rawId) {
  const { user, error } = await requireStaff(req);
  if (error || !user) {
    return { response: createAuthErrorResponse(error || "Authentication required", 401) };
  }
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return {
      response: NextResponse.json(
        { ok: false, error: `Invalid id: ${rawId}` },
        { status: 400 },
      ),
    };
  }
  const officeId = isSystemAdminRole(user.role) ? null : getPrincipalOfficeId(user);
  if (!isSystemAdminRole(user.role) && !officeId) {
    return { response: createAuthErrorResponse("Office scope is required", 403) };
  }
  const row = await getDocumentById(id, officeId ? { officeId } : {});
  if (!row) {
    return { response: NextResponse.json({ ok: false, error: "Not found" }, { status: 404 }) };
  }
  if (!canAccessDocument(user, row)) {
    return { response: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }) };
  }
  return { user, row, id };
}

export async function GET(req, ctx) {
  const params = await ctx.params;
  const raw = params.id;
  const access = await requireDocumentAccess(req, raw);
  if (access.response) return access.response;
  const { row } = access;
  const id = access.id ?? Number(row.id);

  const filePath = getDocumentFilePath(row);

  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json(
      { ok: false, error: "File missing on disk" },
      { status: 404 }
    );
  }

  const bytes = fs.readFileSync(filePath);

  await writeAuditLog(req, "Viewed Document", {
    details: `Viewed ${row.original_filename}.`,
    entity_type: "Document",
    entity_id: String(id),
    officeId: row.office_id,
  });

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
  const access = await requireDocumentAccess(req, raw);
  if (access.response) return access.response;
  const { row: accessRow } = access;
  const id = access.id ?? Number(accessRow.id);

  const contentType = String(req.headers.get("content-type") || "").toLowerCase();
  let body = null;
  let replacementFile = null;
  let studentNo;
  let studentName;
  let docType;
  let approvalStatus;
  let reviewNote;

  let isPreviewed;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json(
        { ok: false, error: "Invalid form data" },
        { status: 400 }
      );
    }
    const file = form.get("file");
    if (file && typeof file !== "string") replacementFile = file;
    studentNo = String(form.get("studentNo") || "").trim() || undefined;
    studentName = String(form.get("studentName") || "").trim() || undefined;
    docType = String(form.get("docType") || "").trim() || undefined;
    approvalStatus = String(form.get("approvalStatus") || "").trim() || undefined;
    reviewNote = String(form.get("reviewNote") || "").trim() || undefined;
    isPreviewed = form.get("isPreviewed") !== null ? (form.get("isPreviewed") === "true") : undefined;
  } else {
    body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    studentNo =
      body.studentNo === undefined ? undefined : String(body.studentNo).trim();
    studentName =
      body.studentName === undefined ? undefined : String(body.studentName).trim();
    docType = body.docType === undefined ? undefined : String(body.docType).trim();
    approvalStatus =
      body.approvalStatus === undefined ? undefined : String(body.approvalStatus).trim();
    reviewNote =
      body.reviewNote === undefined ? undefined : String(body.reviewNote).trim();
    isPreviewed = body.isPreviewed === undefined ? undefined : !!body.isPreviewed;
    if (body.file && typeof body.file !== "string") {
      replacementFile = body.file;
    }
  }

  if (approvalStatus !== undefined) {
    if (!["Pending", "Approved", "Declined"].includes(approvalStatus)) {
      return NextResponse.json(
        { ok: false, error: "Invalid approvalStatus" },
        { status: 400 }
      );
    }

    const reviewer = access.user;
    if (!isSystemAdminRole(reviewer.role) && reviewer.role !== "Admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (approvalStatus === "Declined") {
      const declined = await declineDocumentAndRemoveFile(id, {
        reviewedBy: reviewer.id || null,
        reviewNote: reviewNote || null,
      }, { officeId: accessRow.office_id });
      if (!declined) {
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      }
      await writeAuditLog(req, `Review Document`, { 
        details: `declined digital record for student '${declined.student_name}' (Document: ${declined.doc_type})${reviewNote ? `. Reason: ${reviewNote}` : ""}`,
        severity: "WARNING",
        entity_type: "Document",
        entity_id: id,
        officeId: declined.office_id,
      });
      return NextResponse.json({
        ok: true,
        data: declined,
      });
    }

    const row = await reviewDocument(id, {
      approvalStatus,
      reviewedBy: reviewer.id || null,
      reviewNote: reviewNote || null,
    }, { officeId: accessRow.office_id });
    if (!row) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    await writeAuditLog(req, `Review Document`, { 
      details: `${approvalStatus.toLowerCase()} digital record for student '${row.student_name}' (Document: ${row.doc_type})${reviewNote ? `. Review note: ${reviewNote}` : ""}`,
      entity_type: "Document",
      entity_id: id,
      officeId: row.office_id,
    });
    return NextResponse.json({ ok: true, data: row });
  }

  let row;
  try {
    row = await updateDocumentMetadata(
      id,
      { studentNo, studentName, docType, isPreviewed },
      { officeId: accessRow.office_id },
    );
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to update document" }, { status: 400 });
  }
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  let replaced = false;
  if (replacementFile) {
    if (replacementFile.type !== "application/pdf") {
      return NextResponse.json(
        { ok: false, error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }
    const buf = Buffer.from(await replacementFile.arrayBuffer());
    try {
      row = await replaceDocumentFile(id, {
        originalFilename: replacementFile.name || "document.pdf",
        mimeType: replacementFile.type || "application/pdf",
        sizeBytes: replacementFile.size || buf.length,
        buffer: buf,
      }, { officeId: accessRow.office_id });
    } catch (err) {
      return NextResponse.json({ ok: false, error: err.message || "Failed to replace file" }, { status: 400 });
    }
    replaced = true;
  }
  await writeAuditLog(req, replaced ? `Replace Document File` : `Update Document`, {
    details: replaced 
      ? `overwrote binary file for student '${row.student_name}' (Document: ${row.doc_type}) with updated PDF upload`
      : `updated registry metadata (Student: '${row.student_name}', Type: '${row.doc_type}') for document record #${id}`,
    entity_type: "Document",
    entity_id: id,
    officeId: row.office_id,
  });

  return NextResponse.json({ ok: true, data: row });
}

export async function DELETE(req, ctx) {
  const params = await ctx.params;
  const raw = params.id;
  const access = await requireDocumentAccess(req, raw);
  if (access.response) return access.response;
  const { row: accessRow } = access;
  const id = access.id ?? Number(accessRow.id);

  const row = await deleteDocument(id, { officeId: accessRow.office_id });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await writeAuditLog(req, `Delete Document`, {
    details: `permanently removed digital record for student '${row.student_name}' (Document: ${row.doc_type}) from system repository`,
    severity: "WARNING",
    entity_type: "Document",
    entity_id: id,
    officeId: row.office_id,
  });

  return NextResponse.json({ ok: true, data: row });
}

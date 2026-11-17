import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAuthenticatedPrincipal } from "@/lib/authHelpers";
import { queryOne, transaction } from "@/lib/postgres";
import { cleanReceiptFile, queueReceiptFileCleanup } from "@/lib/receiptFileCleanup";
import { isSystemAdminRole } from "@/lib/roleUtils";
import { FILE_SECURITY_HEADERS, inlineFileDisposition } from "@/lib/fileSecurityHeaders";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

function requestAttachmentsDir() {
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  return path.join(localDir, "storage", "registrar", "request_attachments");
}

async function resolveAttachmentTarget(req, ctx) {
  const user = await getAuthenticatedPrincipal(req);
  if (!user) {
    return { response: NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 }) };
  }

  const params = await ctx.params;
  const requestId = Number(params?.id);
  const attachmentId = Number(params?.attachmentId);

  if (!Number.isInteger(requestId) || requestId < 1 || !Number.isInteger(attachmentId) || attachmentId < 1) {
    return { response: NextResponse.json({ ok: false, error: "Invalid request or attachment ID" }, { status: 400 }) };
  }

  // 1. Fetch document request
  const request = await queryOne(
    "SELECT id, student_no, identity_profile_id, portal_submitter_account_id, office_id, status FROM document_requests WHERE id = $1",
    [requestId]
  );
  if (!request || String(request.office_id || "").trim().toLowerCase() !== "registrar") {
    return { response: NextResponse.json({ ok: false, error: "Document request not found" }, { status: 404 }) };
  }

  // 2. Authorization check
  let authorized = false;
  if (user.principalType === "staff") {
    const officeId = String(user.officeId || user.office_id || "").trim().toLowerCase();
    if (isSystemAdminRole(user.role) || officeId === "registrar") {
      authorized = true;
    }
  } else if (user.principalType === "student") {
    if (
      request.identity_profile_id && String(request.identity_profile_id) === String(user.identityProfileId) &&
      (!request.portal_submitter_account_id || String(request.portal_submitter_account_id) === String(user.accountId))
    ) {
      authorized = true;
    }
  }

  if (!authorized) {
    return { response: NextResponse.json({ ok: false, error: "Forbidden: Access denied to this attachment" }, { status: 403 }) };
  }

  // 3. Fetch attachment record
  const attachment = await queryOne(
    "SELECT id, original_filename, storage_filename, mime_type, size_bytes, attachment_type FROM document_request_attachments WHERE id = $1 AND document_request_id = $2",
    [attachmentId, requestId]
  );
  if (!attachment) {
    return { response: NextResponse.json({ ok: false, error: "Attachment record not found" }, { status: 404 }) };
  }

  // 4. File on disk
  const storageFilename = String(attachment.storage_filename || "");
  if (!storageFilename || path.basename(storageFilename) !== storageFilename) {
    return { response: NextResponse.json({ ok: false, error: "Attachment storage reference is invalid" }, { status: 500 }) };
  }
  const filePath = path.join(requestAttachmentsDir(), storageFilename);

  return { user, request, attachment, filePath };
}

export async function HEAD(req, ctx) {
  const resolved = await resolveAttachmentTarget(req, ctx);
  if (resolved.response) return resolved.response;
  const { attachment, filePath } = resolved;

  if (!fs.existsSync(filePath)) {
    return new NextResponse(null, {
      status: 404,
      headers: {
        "X-File-Missing": "true",
      },
    });
  }

  try {
    const stat = fs.statSync(filePath);
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": attachment.mime_type || "application/octet-stream",
        "Content-Length": String(stat.size),
        "Content-Disposition": inlineFileDisposition(attachment.original_filename || undefined),
        "Cache-Control": "private, max-age=3600",
        ...FILE_SECURITY_HEADERS,
      },
    });
  } catch {
    return new NextResponse(null, {
      status: 404,
      headers: {
        "X-File-Missing": "true",
      },
    });
  }
}

export async function GET(req, ctx) {
  const resolved = await resolveAttachmentTarget(req, ctx);
  if (resolved.response) return resolved.response;
  const { attachment, filePath } = resolved;

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { ok: false, error: "Attachment file missing from storage" },
      {
        status: 404,
        headers: {
          "X-File-Missing": "true",
        },
      }
    );
  }

  const fileBytes = fs.readFileSync(filePath);

  return new NextResponse(fileBytes, {
    status: 200,
    headers: {
      "Content-Type": attachment.mime_type || "application/octet-stream",
      "Content-Length": String(attachment.size_bytes || fileBytes.length),
      "Content-Disposition": inlineFileDisposition(attachment.original_filename || undefined),
      "Cache-Control": "private, max-age=3600",
      ...FILE_SECURITY_HEADERS,
    },
  });
}

export async function DELETE(req, ctx) {
  const resolved = await resolveAttachmentTarget(req, ctx);
  if (resolved.response) return resolved.response;
  const { user, request, attachment } = resolved;

  if (user.principalType !== "student") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (request.status !== "PendingPayment") {
    return NextResponse.json(
      { ok: false, error: "Payment receipts can only be removed while this request is pending payment." },
      { status: 409 }
    );
  }
  if (attachment.attachment_type !== "receipt") {
    return NextResponse.json(
      { ok: false, error: "Only uploaded payment receipts can be removed here." },
      { status: 403 }
    );
  }

  const removed = await transaction(async (db) => {
    const current = await db.queryOne("SELECT status FROM document_requests WHERE id = $1 FOR UPDATE", [request.id]);
    if (current?.status !== "PendingPayment") return null;
    const row = await db.queryOne(
      "DELETE FROM document_request_attachments WHERE id = $1 AND document_request_id = $2 AND attachment_type = 'receipt' RETURNING storage_filename",
      [attachment.id, request.id],
    );
    if (row) await queueReceiptFileCleanup(db, row.storage_filename);
    return row;
  });
  if (!removed) {
    return NextResponse.json({ ok: false, error: "This receipt is no longer available for removal." }, { status: 409 });
  }
  await cleanReceiptFile(removed.storage_filename).catch((error) => {
    console.error("[receipt cleanup] Could not process the queued deletion:", error);
  });

  try {
    await writeGlobalAuditLog(req, "Payment proof removed", {
      officeId: "registrar",
      details: `Student removed payment proof (${attachment.original_filename}) from document request ${request.id}.`,
      entity_type: "document_request",
      entity_id: String(request.id),
    });
  } catch (auditError) {
    console.error("Payment proof removal audit log failed:", auditError);
  }

  return NextResponse.json({ ok: true });
}

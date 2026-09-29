import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAuthenticatedPrincipal } from "@/lib/authHelpers";
import { queryOne } from "@/lib/postgres";
import { isSystemAdminRole } from "@/lib/roleUtils";

export const runtime = "nodejs";

function requestAttachmentsDir() {
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  return path.join(localDir, "storage", "registrar", "request_attachments");
}

export async function GET(req, ctx) {
  const user = await getAuthenticatedPrincipal(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const params = await ctx.params;
  const requestId = Number(params?.id);
  const attachmentId = Number(params?.attachmentId);

  if (!Number.isInteger(requestId) || requestId < 1 || !Number.isInteger(attachmentId) || attachmentId < 1) {
    return NextResponse.json({ ok: false, error: "Invalid request or attachment ID" }, { status: 400 });
  }

  // 1. Fetch document request
  const request = await queryOne(
    "SELECT id, student_no, student_account_id, office_id FROM document_requests WHERE id = $1",
    [requestId]
  );
  if (!request) {
    return NextResponse.json({ ok: false, error: "Document request not found" }, { status: 404 });
  }

  // 2. Authorization check
  let authorized = false;
  if (user.principalType === "staff") {
    if (isSystemAdminRole(user.role) || !user.officeId || user.officeId === "registrar") {
      authorized = true;
    }
  } else if (user.principalType === "student") {
    if (
      (request.student_account_id && String(request.student_account_id) === String(user.accountId)) ||
      (request.student_no && user.studentNo && request.student_no.toUpperCase() === user.studentNo.toUpperCase())
    ) {
      authorized = true;
    }
  }

  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Forbidden: Access denied to this attachment" }, { status: 403 });
  }

  // 3. Fetch attachment record
  const attachment = await queryOne(
    "SELECT id, original_filename, storage_filename, mime_type, size_bytes FROM document_request_attachments WHERE id = $1 AND document_request_id = $2",
    [attachmentId, requestId]
  );
  if (!attachment) {
    return NextResponse.json({ ok: false, error: "Attachment record not found" }, { status: 404 });
  }

  // 4. File on disk
  const filePath = path.join(requestAttachmentsDir(), attachment.storage_filename);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ ok: false, error: "Attachment file missing from storage" }, { status: 404 });
  }

  const fileBytes = fs.readFileSync(filePath);
  const safeFilename = encodeURIComponent(attachment.original_filename);

  return new NextResponse(fileBytes, {
    status: 200,
    headers: {
      "Content-Type": attachment.mime_type || "application/octet-stream",
      "Content-Length": String(attachment.size_bytes || fileBytes.length),
      "Content-Disposition": `inline; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

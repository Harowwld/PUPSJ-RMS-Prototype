import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { query, queryOne } from "@/lib/postgres";
import { addRequestAttachment } from "@/lib/documentRequestsRepo";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["application/pdf", ".pdf"],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);

function requestAttachmentsDir() {
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  return path.join(localDir, "storage", "registrar", "request_attachments");
}

export async function POST(req, ctx) {
  const access = await requireStudent(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(access.error || "Student authentication required");
  }

  const { id } = await ctx.params;
  const requestId = Number(id);
  if (!Number.isSafeInteger(requestId) || requestId < 1) {
    return NextResponse.json({ ok: false, error: "Invalid document request ID." }, { status: 400 });
  }

  const request = await queryOne(
    "SELECT * FROM document_requests WHERE id = $1 AND office_id = 'registrar'",
    [requestId]
  );
  if (!request || !canAccessResource(access.user, "request", request)) {
    return NextResponse.json({ ok: false, error: "Document request not found." }, { status: 404 });
  }
  if (request.status !== "PendingPayment") {
    return NextResponse.json({ ok: false, error: "Payment proof can only be uploaded while this request is pending payment." }, { status: 409 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ ok: false, error: "Choose a receipt or payment proof file." }, { status: 400 });
  }
  if (!file.size || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ ok: false, error: "The file must be between 1 byte and 10 MB." }, { status: 400 });
  }
  const mimeType = String(file.type || "").toLowerCase();
  const extension = ALLOWED_TYPES.get(mimeType);
  if (!extension) {
    return NextResponse.json({ ok: false, error: "Upload a PDF, PNG, JPG, or WEBP image." }, { status: 415 });
  }

  const originalFilename = path.basename(String(file.name || `payment-proof${extension}`)).slice(0, 255);
  const storageFilename = `${crypto.randomUUID()}${extension}`;
  const directory = requestAttachmentsDir();
  const filePath = path.join(directory, storageFilename);
  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()), { flag: "wx" });
    const attachment = await addRequestAttachment({
      documentRequestId: requestId,
      originalFilename,
      storageFilename,
      mimeType,
      sizeBytes: file.size,
      attachmentType: "receipt",
      uploadedBy: access.user.id,
    });
    await query(
      "INSERT INTO transaction_updates (document_request_id, status, message) VALUES ($1, $2, $3)",
      [requestId, "PendingPayment", "Student uploaded payment proof: " + originalFilename]
    );
    await writeGlobalAuditLog(req, "Payment proof uploaded", {
      officeId: "registrar",
      details: `Student uploaded payment proof for document request ${requestId}.`,
      entity_type: "document_request",
      entity_id: String(requestId),
    });
    return NextResponse.json({
      ok: true,
      data: {
        ...attachment,
        url: `/api/document-requests/${requestId}/attachments/${attachment.id}`,
      },
    }, { status: 201 });
  } catch (error) {
    await fs.unlink(filePath).catch(() => {});
    console.error("Payment proof upload failed:", error);
    return NextResponse.json({ ok: false, error: "Unable to save payment proof." }, { status: 500 });
  }
}

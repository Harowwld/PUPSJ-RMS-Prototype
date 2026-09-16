import fs from "node:fs";
import { NextResponse } from "next/server";
import { getIngestById, getIngestFilePath } from "@/lib/ingestQueueRepo";
import { getDocumentById, getDocumentFilePath } from "@/lib/documentsRepo";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../../../lib/authHelpers";
import { canAccessResource } from "../../../../../../lib/resourceAuthorization";

export const runtime = "nodejs";

export async function GET(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const params = await ctx.params;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }
  const row = await getIngestById(id, { officeId });
  if (!row || !canAccessResource(user, "ingest", row) || row.status === "rejected") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  // Confirmed items are promoted to the formal documents table and their
  // temporary ingest file is removed. Resolve that document for the preview.
  const document = row.promoted_document_id ? await getDocumentById(row.promoted_document_id, { officeId }) : null;
  if (document && !canAccessResource(user, "document", document)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  const previewRow = document || row;
  const absPath = document ? getDocumentFilePath(document) : getIngestFilePath(row.storage_filename);
  if (!absPath || !fs.existsSync(absPath)) {
    return NextResponse.json({ ok: false, error: "File missing on disk" }, { status: 404 });
  }
  const bytes = fs.readFileSync(absPath);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": previewRow.mime_type || "application/octet-stream",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename="${previewRow.original_filename || "scan.bin"}"`,
    },
  });
}

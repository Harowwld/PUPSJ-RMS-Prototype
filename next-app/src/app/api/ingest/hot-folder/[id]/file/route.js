import fs from "node:fs";
import { NextResponse } from "next/server";
import { getIngestById, getIngestFilePath } from "@/lib/ingestQueueRepo";
import { getDocumentById, getDocumentFilePath, setOfficeStoragePath } from "@/lib/documentsRepo";
import { getOfficeById } from "@/lib/officesRepo";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../../../lib/authHelpers";
import { canAccessResource } from "../../../../../../lib/resourceAuthorization";
import { FILE_SECURITY_HEADERS } from "@/lib/fileSecurityHeaders";

export const runtime = "nodejs";

async function resolveIngestTarget(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return { response: createAuthErrorResponse(error || "Authentication required") };
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return { response: createAuthErrorResponse("Office scope is required", 403) };
  const params = await ctx.params;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return { response: NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 }) };
  }
  const row = await getIngestById(id, { officeId });
  if (!row || !canAccessResource(user, "ingest", row) || row.status === "rejected") {
    return { response: NextResponse.json({ ok: false, error: "Not found" }, { status: 404 }) };
  }

  // Confirmed items are promoted to the formal documents table and their
  // temporary ingest file is removed. Resolve that document for the preview.
  const document = row.promoted_document_id ? await getDocumentById(row.promoted_document_id, { officeId }) : null;
  if (document && !canAccessResource(user, "document", document)) {
    return { response: NextResponse.json({ ok: false, error: "Not found" }, { status: 404 }) };
  }
  if (document) {
    const office = await getOfficeById(officeId);
    if (office?.storage_path) setOfficeStoragePath(officeId, office.storage_path);
  }
  const previewRow = document || row;
  const absPath = document ? getDocumentFilePath(document) : getIngestFilePath(row.storage_filename);
  return { previewRow, absPath };
}

export async function HEAD(req, ctx) {
  const resolved = await resolveIngestTarget(req, ctx);
  if (resolved.response) return resolved.response;
  const { previewRow, absPath } = resolved;

  if (!absPath || !fs.existsSync(absPath)) {
    return new NextResponse(null, {
      status: 404,
      headers: {
        "X-File-Missing": "true",
      },
    });
  }

  try {
    const stat = fs.statSync(absPath);
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": previewRow.mime_type || "application/octet-stream",
        "Content-Length": String(stat.size),
        "Content-Disposition": `inline; filename="${previewRow.original_filename || "scan.bin"}"`,
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
  const resolved = await resolveIngestTarget(req, ctx);
  if (resolved.response) return resolved.response;
  const { previewRow, absPath } = resolved;

  if (!absPath || !fs.existsSync(absPath)) {
    return NextResponse.json(
      { ok: false, error: "File missing on disk" },
      {
        status: 404,
        headers: {
          "X-File-Missing": "true",
        },
      }
    );
  }
  const bytes = fs.readFileSync(absPath);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": previewRow.mime_type || "application/octet-stream",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename="${previewRow.original_filename || "scan.bin"}"`,
      ...FILE_SECURITY_HEADERS,
    },
  });
}

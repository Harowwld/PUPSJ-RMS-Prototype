import crypto from "node:crypto";
import fs from "node:fs";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/auditLogRequest";
import {
  createIngestItem,
  abandonAllPendingIngest,
  getIngestFilePath,
  listPendingIngest,
  makeIngestStorageFilename,
} from "@/lib/ingestQueueRepo";
import {
  HOT_FOLDER_MAX_FILE_BYTES,
  detectMimeFromMagicBytes,
  validateIngestFileType,
} from "@/lib/ingestFileTypes";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../lib/authHelpers";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { publishIngestEvent } from "@/lib/ingestEvents";
import { triggerIngestProcessing } from "@/lib/ingestEventProcessor";

export const runtime = "nodejs";

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function hasValidMachineToken(req) {
  const authorization = String(req.headers.get("authorization") || "");
  const providedToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  const expectedToken = String(process.env.HOT_FOLDER_INGEST_TOKEN || "").trim();
  return constantTimeEqual(providedToken, expectedToken);
}

function getMachineContext(req, sourceStation, requestedOffice) {
  const approvedStation = String(process.env.HOT_FOLDER_SOURCE_STATION || "Scanner-PC").trim();
  const approvedOfficeId = String(process.env.HOT_FOLDER_OFFICE_ID || "registrar").trim().toLowerCase();
  if (!hasValidMachineToken(req)) return null;
  if (String(sourceStation || "").trim() !== approvedStation) return null;
  if (String(requestedOffice || "").trim().toLowerCase() !== approvedOfficeId) return null;
  return { approvedOfficeId, approvedStation };
}

export async function POST(req) {
  if (!hasValidMachineToken(req)) {
    return NextResponse.json({ ok: false, error: "Invalid ingest token or source binding" }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "Invalid form data" }, { status: 400 });

  const file = form.get("file");
  const sourceStation = String(form.get("sourceStation") || req.headers.get("x-source-station") || "").trim();
  const requestedOffice = String(form.get("officeId") || process.env.HOT_FOLDER_OFFICE_ID || "registrar").trim().toLowerCase();
  const machineContext = getMachineContext(req, sourceStation, requestedOffice);
  if (!machineContext) return NextResponse.json({ ok: false, error: "Invalid ingest token or source binding" }, { status: 401 });
  const { approvedOfficeId } = machineContext;
  if (!file || typeof file === "string") {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length) return NextResponse.json({ ok: false, error: "Empty file" }, { status: 400 });
  if (bytes.length > HOT_FOLDER_MAX_FILE_BYTES) {
    return NextResponse.json({ ok: false, error: "File exceeds 25MB limit" }, { status: 413 });
  }

  const detectedMime = detectMimeFromMagicBytes(bytes);
  const typeCheck = validateIngestFileType({
    filename: file.name,
    detectedMime,
    declaredMime: String(file.type || ""),
  });
  if (!typeCheck.ok) return NextResponse.json({ ok: false, error: typeCheck.error }, { status: 400 });

  const storageFilename = makeIngestStorageFilename(file.name || "scan.bin");
  const absPath = getIngestFilePath(storageFilename);
  fs.writeFileSync(absPath, bytes);
  const contentSha256 = crypto.createHash("sha256").update(bytes).digest("hex");

  const row = await createIngestItem({
    officeId: approvedOfficeId,
    originalFilename: file.name || "scan.bin",
    storageFilename,
    mimeType: typeCheck.mimeType,
    sizeBytes: bytes.length,
    sourceStation: sourceStation || null,
    contentSha256,
  });

  await publishIngestEvent({ type: "ingest_created", officeId: approvedOfficeId, id: row.id });
  await triggerIngestProcessing(approvedOfficeId, `ingest #${row.id}`);

  await writeAuditLog(req, `Hot-folder ingest received #${row.id}`, {
    actor: sourceStation ? `Hot folder (${sourceStation})` : "Hot folder",
    role: "System",
  });

  return NextResponse.json({ ok: true, data: row }, { status: 201 });
}

export async function GET(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 20);
  const offset = Number(searchParams.get("offset") || 0);
  const includeFailed = String(searchParams.get("includeFailed") || "") === "1";
  const includeRejected = String(searchParams.get("includeRejected") || "1") !== "0";
  const onlyUnprocessed = String(searchParams.get("onlyUnprocessed") || "") === "1";
  const data = await listPendingIngest({ limit, offset, includeFailed, includeRejected, onlyUnprocessed, batchId: searchParams.get("batchId") || null, officeId });
  return NextResponse.json({ ok: true, data: { ...data, rows: data.rows.filter((item) => canAccessResource(user, "ingest", item)) } });
}

export async function DELETE(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const result = await abandonAllPendingIngest(officeId);
  await writeAuditLog(req, `Cleared scanner inbox (${result.clearedCount} item(s))`);
  return NextResponse.json({ ok: true, data: result });
}

import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { createDocument, getUploadsDir } from "@/lib/documentsRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { createStudent } from "@/lib/studentsRepo";
import { requireStaff, createAuthErrorResponse } from "@/lib/authHelpers";
import {
  getIngestById,
  getIngestFilePath,
  markIngestFailed,
  markIngestPromoted,
} from "@/lib/ingestQueueRepo";
import { HOT_FOLDER_ALLOWED_MIME_TYPES, isAllowedIngestExtension } from "@/lib/ingestFileTypes";
import { isUniqueViolation } from "@/lib/dbErrors";
import { rotateDocumentBuffer } from "@/lib/documentOrientation";

export const runtime = "nodejs";

function sanitizeNameForFs(input) {
  return String(input || "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 140);
}

export async function POST(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Authentication required", 401);
  }

  const params = await ctx.params;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const ingest = await getIngestById(id);
  if (!ingest) return NextResponse.json({ ok: false, error: "Ingest item not found" }, { status: 404 });
  if (String(ingest.status) !== "pending") {
    return NextResponse.json({ ok: false, error: "Ingest item already processed" }, { status: 409 });
  }

  if (
    !HOT_FOLDER_ALLOWED_MIME_TYPES.has(String(ingest.mime_type || "")) ||
    !isAllowedIngestExtension(String(ingest.original_filename || ""))
  ) {
    await markIngestFailed(id, "Ingest file type no longer allowed for promotion");
    return NextResponse.json({ ok: false, error: "Unsupported ingest file type" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const studentNo = String(body.studentNo || "").trim().toUpperCase();
  const studentName = String(body.studentName || "").trim();
  const docType = String(body.docType || "").trim();
  const isNewStudent = String(body.isNewStudent || "").toLowerCase() === "true";
  if (!studentNo || !docType) {
    return NextResponse.json({ ok: false, error: "studentNo and docType are required" }, { status: 400 });
  }

  if (isNewStudent) {
    const courseCode = String(body.courseCode || "").trim().toUpperCase();
    const yearLevel = parseInt(String(body.yearLevel || ""), 10);
    const section = String(body.section || "").trim();
    const room = parseInt(String(body.room || ""), 10);
    const cabinet = String(body.cabinet || "").trim();
    const drawer = parseInt(String(body.drawer || ""), 10);
    if (!studentName || !courseCode || !section || !Number.isFinite(yearLevel) || !Number.isFinite(room) || !cabinet || !Number.isFinite(drawer)) {
      return NextResponse.json({ ok: false, error: "Missing required new student fields" }, { status: 400 });
    }
    try {
      await createStudent({
        studentNo,
        name: studentName,
        courseCode,
        yearLevel,
        section,
        room,
        cabinet,
        drawer,
        status: "Active",
      });
    } catch (e) {
      const msg = String(e?.message || "Failed to create student");
      return NextResponse.json({ ok: false, error: isUniqueViolation(e) ? "Student already exists" : msg }, { status: isUniqueViolation(e) ? 409 : 400 });
    }
  }

  const sourceAbsPath = getIngestFilePath(ingest.storage_filename);
  if (!fs.existsSync(sourceAbsPath)) {
    await markIngestFailed(id, "Ingest source file missing on disk");
    return NextResponse.json({ ok: false, error: "Ingest file missing on disk" }, { status: 404 });
  }

  const sourceBytes = fs.readFileSync(sourceAbsPath);
  const rotation = Number(ingest.match_evidence?.detectedRotation || 0);
  const bytes = await rotateDocumentBuffer(sourceBytes, ingest.original_filename, rotation);
  const ext = path.extname(String(ingest.original_filename || "")).toLowerCase();
  const officeId = user.office_id || "registrar";
  const targetStorageFilename = `${sanitizeNameForFs(studentNo)}_${sanitizeNameForFs(docType)}_${Date.now()}${ext || ".pdf"}`;
  const targetAbsPath = path.join(getUploadsDir(officeId), targetStorageFilename);
  fs.writeFileSync(targetAbsPath, bytes);

  const doc = await createDocument({
    officeId: user.office_id || "registrar",
    studentNo,
    studentName: studentName || null,
    docType,
    originalFilename: String(ingest.original_filename || "scan.bin"),
    mimeType: String(ingest.mime_type || "application/octet-stream"),
    sizeBytes: Number(ingest.size_bytes || bytes.length),
    storageFilename: targetStorageFilename,
    uploadedBy: user.id,
  });
  await markIngestPromoted(id, doc.id);
  await writeAuditLog(req, `Promote Ingest`, { 
    details: `promoted digital artifact '${ingest.original_filename}' to formal record for student '${studentName || studentNo}' (Type: ${docType})`,
    entity_type: "Document",
    entity_id: doc.id
  });

  return NextResponse.json({ ok: true, data: { ingestId: id, document: doc } }, { status: 201 });
}

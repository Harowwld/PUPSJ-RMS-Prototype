import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { createDocument, getUploadsDir } from "@/lib/documentsRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { createStudent } from "@/lib/studentsRepo";
import {
  getIngestById,
  getIngestFilePath,
  markIngestFailed,
  markIngestPromoted,
} from "@/lib/ingestQueueRepo";
import { HOT_FOLDER_ALLOWED_MIME_TYPES, isAllowedIngestExtension } from "@/lib/ingestFileTypes";

export const runtime = "nodejs";

function sanitizeNameForFs(input) {
  return String(input || "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 140);
}

export async function POST(req, ctx) {
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
      return NextResponse.json({ ok: false, error: msg }, { status: msg.includes("exists") ? 409 : 400 });
    }
  }

  const sourceAbsPath = getIngestFilePath(ingest.storage_filename);
  if (!fs.existsSync(sourceAbsPath)) {
    await markIngestFailed(id, "Ingest source file missing on disk");
    return NextResponse.json({ ok: false, error: "Ingest file missing on disk" }, { status: 404 });
  }

  const bytes = fs.readFileSync(sourceAbsPath);
  const ext = path.extname(String(ingest.original_filename || "")).toLowerCase();
  const targetStorageFilename = `${Date.now()}-${sanitizeNameForFs(path.basename(String(ingest.storage_filename || "file"), ext))}${ext}`;
  const targetAbsPath = path.join(getUploadsDir(), targetStorageFilename);
  fs.copyFileSync(sourceAbsPath, targetAbsPath);

  const doc = await createDocument({
    studentNo,
    studentName: studentName || null,
    docType,
    originalFilename: String(ingest.original_filename || "scan.bin"),
    mimeType: String(ingest.mime_type || "application/octet-stream"),
    sizeBytes: Number(ingest.size_bytes || bytes.length),
    storageFilename: targetStorageFilename,
  });
  await markIngestPromoted(id, doc.id);
  await writeAuditLog(req, `Promoted ingest #${id} to document #${doc.id}`);

  return NextResponse.json({ ok: true, data: { ingestId: id, document: doc } }, { status: 201 });
}

import crypto from "node:crypto";
import fs from "node:fs";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/auditLogRequest";
import {
  createIngestItem,
  getIngestFilePath,
  listPendingIngest,
  makeIngestStorageFilename,
} from "@/lib/ingestQueueRepo";
import {
  HOT_FOLDER_MAX_FILE_BYTES,
  detectMimeFromMagicBytes,
  validateIngestFileType,
} from "@/lib/ingestFileTypes";

export const runtime = "nodejs";

export async function POST(req) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "Invalid form data" }, { status: 400 });

  const file = form.get("file");
  const sourceStation = String(form.get("sourceStation") || "").trim();
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
    originalFilename: file.name || "scan.bin",
    storageFilename,
    mimeType: typeCheck.mimeType,
    sizeBytes: bytes.length,
    sourceStation: sourceStation || null,
    contentSha256,
  });

  await writeAuditLog(req, `Hot-folder ingest received #${row.id}`, {
    actor: sourceStation ? `Hot folder (${sourceStation})` : "Hot folder",
    role: "System",
  });

  return NextResponse.json({ ok: true, data: row }, { status: 201 });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 20);
  const offset = Number(searchParams.get("offset") || 0);
  const includeFailed = String(searchParams.get("includeFailed") || "") === "1";
  const data = await listPendingIngest({ limit, offset, includeFailed });
  return NextResponse.json({ ok: true, data });
}

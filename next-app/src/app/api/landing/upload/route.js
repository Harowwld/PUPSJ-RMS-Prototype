import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { transaction } from "@/lib/postgres";
import { heroMediaFilename, heroMediaPath, lockHeroMedia, removeUnusedHeroMedia } from "@/lib/landingHeroMedia";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const EXTENSION_MAP = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function hasMatchingImageSignature(buffer, mimeType) {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === "image/webp") {
    return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  }
  if (mimeType === "image/avif") {
    if (buffer.length < 16 || buffer.toString("ascii", 4, 8) !== "ftyp") return false;
    const boxSize = buffer.readUInt32BE(0);
    const end = Math.min(boxSize || buffer.length, buffer.length);
    for (let offset = 8; offset + 4 <= end; offset += 4) {
      const brand = buffer.toString("ascii", offset, offset + 4);
      if (brand === "avif" || brand === "avis") return true;
    }
  }
  return false;
}

export async function POST(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", 403);

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { ok: false, error: "No image file provided." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid file type. Supported formats: JPEG, PNG, WebP, AVIF.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "Image exceeds maximum allowed size of 10MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!hasMatchingImageSignature(buffer, file.type)) {
      return NextResponse.json({ ok: false, error: "Image data does not match the declared file type." }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "assets", "landing");
    fs.mkdirSync(uploadDir, { recursive: true });

    const ext = EXTENSION_MAP[file.type] || "jpg";
    const uniqueId = crypto.randomBytes(6).toString("hex");
    const filename = `hero-${Date.now()}-${uniqueId}.${ext}`;
    const targetPath = heroMediaPath(filename);

    fs.writeFileSync(targetPath, buffer);

    const publicUrl = `/assets/landing/${filename}`;

    await writeGlobalAuditLog(req, "Upload Landing Page Media", {
      entity_type: "LandingMedia",
      entity_id: filename,
      details: `Uploaded hero carousel image: ${file.name} (${Math.round(file.size / 1024)} KB).`,
    });

    return NextResponse.json({
      ok: true,
      data: {
        url: publicUrl,
        filename,
        originalName: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
      },
    });
  } catch (err) {
    console.error("[api/landing/upload] Upload error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to upload image." },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", 403);

  const filename = new URL(req.url).searchParams.get("filename")?.trim() || "";
  if (!heroMediaFilename(`/assets/landing/${filename}`)) {
    return NextResponse.json({ ok: false, error: "Invalid landing media filename." }, { status: 400 });
  }

  try {
    const result = await transaction(async (db) => {
      await lockHeroMedia(db);
      return removeUnusedHeroMedia(db, filename);
    });
    if (result === "in-use") {
      return NextResponse.json({ ok: false, error: "Remove this image from the hero slides before deleting it." }, { status: 409 });
    }
    if (result === "missing") return NextResponse.json({ ok: true });
    await writeGlobalAuditLog(req, "Delete Landing Page Media", {
      entity_type: "LandingMedia",
      entity_id: filename,
      details: `Deleted unreferenced landing media file '${filename}'.`,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/landing/upload] DELETE error:", err);
    return NextResponse.json({ ok: false, error: "Failed to delete landing media." }, { status: 500 });
  }
}

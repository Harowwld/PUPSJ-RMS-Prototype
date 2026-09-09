import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { verifySessionToken, getSessionCookieName } from "@/lib/jwt";
import { isSystemAdminRole } from "@/lib/roleUtils";
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

async function isSuperAdmin(req) {
  try {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return false;
    const payload = await verifySessionToken(token);
    return isSystemAdminRole(payload?.role);
  } catch {
    return false;
  }
}

export async function POST(req) {
  if (!(await isSuperAdmin(req))) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. SuperAdmin privileges required." },
      { status: 403 }
    );
  }

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

    const uploadDir = path.join(process.cwd(), "public", "assets", "landing");
    fs.mkdirSync(uploadDir, { recursive: true });

    const ext = EXTENSION_MAP[file.type] || "jpg";
    const uniqueId = crypto.randomBytes(6).toString("hex");
    const filename = `hero-${Date.now()}-${uniqueId}.${ext}`;
    const targetPath = path.join(uploadDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
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

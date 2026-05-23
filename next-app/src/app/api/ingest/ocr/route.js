import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { performNativeOcr } from "../../../../lib/appleVisionOcr";
import fs from "fs";
import path from "path";
import os from "os";

export const runtime = "nodejs";

/**
 * Endpoint POST /api/ingest/ocr
 * Secure server-side native OCR route. Saves the uploaded document to a temporary file,
 * triggers high-speed native Apple Vision extraction, deletes the temporary file,
 * and returns the completed transcription text.
 */
export async function POST(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Authentication required", 401);
  }

  // Ensure this is macOS, fallback otherwise
  if (os.platform() !== "darwin") {
    return NextResponse.json(
      { ok: false, error: "Native Apple Vision OCR is only supported on macOS." },
      { status: 400 }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid file" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Establish temp directory inside .local/
    const tempDir = path.join(process.cwd(), ".local", "temp_ocr");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedFilename = (file.name || "document.pdf").replace(/[^a-zA-Z0-9.-]/g, "_");
    const tempFilename = `ocr_${Date.now()}_${randomSuffix}_${sanitizedFilename}`;
    const tempFilePath = path.join(tempDir, tempFilename);

    fs.writeFileSync(tempFilePath, buffer);

    let text = "";
    try {
      text = await performNativeOcr(tempFilePath);
    } finally {
      // Ensure we always clean up filesystem resources
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

    return NextResponse.json({ ok: true, text });

  } catch (err) {
    console.error("[POST /api/ingest/ocr] failed:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to process native OCR" },
      { status: 500 }
    );
  }
}

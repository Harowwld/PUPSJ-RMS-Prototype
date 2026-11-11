import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { performNativeOcrWithRetry } from "../../../../lib/appleVisionOcr";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { DOCUMENT_MAX_SIZE_BYTES, DOCUMENT_MAX_SIZE_LABEL } from "@/lib/uploadLimits";
import fs from "fs";
import path from "path";
import os from "os";

export const runtime = "nodejs";

/**
 * Endpoint POST /api/ingest/ocr
 * Secure server-side OCR route. Saves the uploaded document to a temporary file,
 * runs the platform OCR engine, deletes the temporary file,
 * and returns the completed transcription text.
 */
export async function POST(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Authentication required", 401);
  }

  try {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid file" },
        { status: 400 }
      );
    }

    if (!file.size) {
      return NextResponse.json({ ok: false, error: "The uploaded file is empty." }, { status: 400 });
    }
    if (!(file.type.startsWith("image/") || file.type === "application/pdf" || /\.pdf$/i.test(file.name))) {
      return NextResponse.json({ ok: false, error: "Upload a PDF or image file for OCR." }, { status: 415 });
    }

    if (file.size > DOCUMENT_MAX_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: `File exceeds the ${DOCUMENT_MAX_SIZE_LABEL} limit for OCR processing.` },
        { status: 413 }
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

    let ocrResult = { text: "", pages: [] };
    let ocrMs = 0;
    try {
      const ocrStartedAt = performance.now();
      ocrResult = await performNativeOcrWithRetry(tempFilePath);
      ocrMs = performance.now() - ocrStartedAt;
    } finally {
      // Ensure we always clean up filesystem resources
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

    await writeAuditLog(req, "Processed Document with OCR", {
      details: `OCR processed ${file.name || "document.pdf"}.`,
      entity_type: "ocr_scan",
      entity_id: file.name || "document.pdf",
    });
    console.info("[OCR timing] Native OCR", JSON.stringify({
      engine: os.platform(),
      pages: ocrResult.pages?.length || 0,
      ocrMs,
    }));
    return NextResponse.json({
      ok: true,
      text: ocrResult.text,
      pages: ocrResult.pages,
      engine: os.platform() === "darwin"
        ? "apple-vision"
        : os.platform() === "win32"
          ? "windows-media"
          : "tesseract",
      timings: { ocrMs },
    });

  } catch (err) {
    if (err.code === "INVALID_OCR_FILE") {
      return NextResponse.json({ ok: false, error: "The uploaded file could not be decoded. Check that it opens and try again." }, { status: 422 });
    }
    console.error("[POST /api/ingest/ocr] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to process native OCR" },
      { status: 500 }
    );
  }
}

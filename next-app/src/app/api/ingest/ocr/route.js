import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { performNativeOcr } from "../../../../lib/appleVisionOcr";
import { writeAuditLog } from "@/lib/auditLogRequest";
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

    let ocrResult = { text: "", pages: [] };
    let ocrMs = 0;
    try {
      const ocrStartedAt = performance.now();
      ocrResult = await performNativeOcr(tempFilePath);
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
    console.error("[POST /api/ingest/ocr] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to process native OCR" },
      { status: 500 }
    );
  }
}

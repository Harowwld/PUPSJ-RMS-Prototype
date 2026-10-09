import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performNativeOcr } from "./appleVisionOcr.js";

function makeWarmupBitmap() {
  const width = 320;
  const height = 96;
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = Buffer.alloc(rowSize * height, 255);
  const header = Buffer.alloc(54);
  header.write("BM");
  header.writeUInt32LE(header.length + pixelBytes.length, 2);
  header.writeUInt32LE(54, 10);
  header.writeUInt32LE(40, 14);
  header.writeInt32LE(width, 18);
  header.writeInt32LE(height, 22);
  header.writeUInt16LE(1, 26);
  header.writeUInt16LE(24, 28);
  header.writeUInt32LE(pixelBytes.length, 34);
  return Buffer.concat([header, pixelBytes]);
}

export async function warmupNativeOcr() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "pupsj-ocr-warmup-"));
  const imagePath = path.join(tempDir, "warmup.bmp");

  try {
    await writeFile(imagePath, makeWarmupBitmap());
    await performNativeOcr(imagePath);
    console.info("[OCR] Native OCR warmup completed.");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

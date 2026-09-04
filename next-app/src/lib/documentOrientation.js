import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PDFDocument, degrees } from "pdf-lib";

const execFileAsync = promisify(execFile);

export async function rotateDocumentBuffer(buffer, filename, rotation = 0) {
  const normalized = ((Number(rotation) % 360) + 360) % 360;
  if (!buffer || normalized === 0) return buffer;

  const name = String(filename || "document");
  if (/\.pdf$/i.test(name)) {
    const pdf = await PDFDocument.load(buffer);
    for (const page of pdf.getPages()) {
      const current = page.getRotation().angle || 0;
      page.setRotation(degrees((current + normalized) % 360));
    }
    return Buffer.from(await pdf.save());
  }

  if (process.platform !== "darwin" || !/^image\//i.test(inferMimeType(name))) return buffer;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pupsj-rotate-"));
  const ext = path.extname(name).toLowerCase() || ".jpg";
  const inputPath = path.join(tempDir, `input${ext}`);
  const outputPath = path.join(tempDir, `output${ext}`);
  try {
    fs.writeFileSync(inputPath, buffer);
    await execFileAsync("sips", ["-r", String(normalized), "--out", outputPath, inputPath]);
    return fs.readFileSync(outputPath);
  } catch {
    return buffer;
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}

function inferMimeType(filename) {
  return /\.png$/i.test(filename) ? "image/png" : "image/jpeg";
}

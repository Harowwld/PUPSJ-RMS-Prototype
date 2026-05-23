import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs";

const execFileAsync = promisify(execFile);

/**
 * Executes the compiled macOS Swift binary to perform fast, offline high-precision OCR on a PDF or image file.
 * Only runs on macOS (darwin) hosts.
 * 
 * @param {string} filePath - Absolute path to the image or PDF file to run OCR on.
 * @returns {Promise<string>} - The recognized text.
 */
export async function performNativeOcr(filePath) {
  if (os.platform() !== "darwin") {
    throw new Error("Native Apple Vision OCR is only supported on macOS.");
  }

  // Resolve binary path inside next-app/bin/
  const binaryPath = path.join(process.cwd(), "bin", "apple-vision-ocr");

  if (!fs.existsSync(binaryPath)) {
    throw new Error(`Native Apple Vision OCR binary not found at: ${binaryPath}`);
  }

  try {
    const { stdout, stderr } = await execFileAsync(binaryPath, [filePath]);
    if (stderr && stderr.trim() !== "") {
      console.warn("[Apple Vision OCR System Warning]", stderr);
    }
    return stdout ? stdout.trim() : "";
  } catch (error) {
    console.error("[Apple Vision OCR System Error]", error);
    throw new Error(`Native OCR execution failed: ${error.message}`);
  }
}

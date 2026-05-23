import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs";

const execFileAsync = promisify(execFile);

/**
 * Coordinates and routes file OCR execution to the appropriate native system CLI
 * depending on host platform (macOS vs Windows).
 * 
 * @param {string} filePath - Absolute path to the image or PDF file to run OCR on.
 * @returns {Promise<string>} - The recognized text.
 */
export async function performNativeOcr(filePath) {
  const platform = os.platform();
  let binaryName = "";

  if (platform === "darwin") {
    binaryName = "apple-vision-ocr";
  } else if (platform === "win32") {
    binaryName = "windows-media-ocr.exe";
  } else {
    throw new Error(`Native offline OCR is only supported on macOS and Windows. Current OS: ${platform}`);
  }

  // Resolve binary path inside next-app/bin/
  const binaryPath = path.join(process.cwd(), "bin", binaryName);

  if (!fs.existsSync(binaryPath)) {
    if (platform === "darwin") {
      throw new Error(
        `Native Apple Vision OCR binary not found at: ${binaryPath}\n` +
        `To compile the macOS binary, please run:\n` +
        `  swiftc -O scripts/apple-vision-ocr/ocr.swift -o bin/apple-vision-ocr`
      );
    } else {
      throw new Error(
        `Native Windows OCR binary not found at: ${binaryPath}\n` +
        `To compile the Windows binary, please run the build batch file:\n` +
        `  scripts\\windows-media-ocr\\build.bat\n` +
        `(Note: This requires the .NET 8.0 SDK or newer to be installed on your Windows machine).`
      );
    }
  }

  try {
    const { stdout, stderr } = await execFileAsync(binaryPath, [filePath]);
    if (stderr && stderr.trim() !== "") {
      console.warn(`[System OCR Warning (${platform})]`, stderr);
    }
    return stdout ? stdout.trim() : "";
  } catch (error) {
    console.error(`[System OCR Error (${platform})]`, error);
    throw new Error(`Native OCR execution failed: ${error.message}`);
  }
}

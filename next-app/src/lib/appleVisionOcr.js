import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const execFileAsync = promisify(execFile);

function getBinaryPath(platform) {
  const binaryName = platform === "darwin" ? "apple-vision-ocr" : "windows-media-ocr.exe";
  return path.join(process.cwd(), "bin", binaryName);
}

function getBinaryError(platform, binaryPath) {
  if (platform === "darwin") {
    return new Error(
      `Native Apple Vision OCR binary not found at: ${binaryPath}\n` +
      "Compile it with: swiftc -O scripts/apple-vision-ocr/ocr.swift -o bin/apple-vision-ocr"
    );
  }
  return new Error(
    `Native Windows OCR binary not found at: ${binaryPath}\n` +
    "Build it with scripts\\windows-media-ocr\\build.bat (requires .NET 8 SDK)."
  );
}

/** Runs a native OCR process for this file. Linux continues using Tesseract. */
export async function performNativeOcr(filePath) {
  const platform = os.platform();
  if (platform === "linux") {
    const { performTesseractOcr } = await import("./tesseractOcr.js");
    return performTesseractOcr(filePath);
  }
  if (platform !== "darwin" && platform !== "win32") {
    throw new Error(`Native offline OCR is only supported on macOS and Windows. Current OS: ${platform}`);
  }

  const binaryPath = getBinaryPath(platform);
  if (!fs.existsSync(binaryPath)) throw getBinaryError(platform, binaryPath);

  try {
    const { stdout, stderr } = await execFileAsync(binaryPath, [path.resolve(filePath)], {
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 5 * 60 * 1000,
    });
    if (stderr?.trim()) console.warn(`[System OCR Warning (${platform})] ${stderr.trim()}`);

    let result;
    try {
      result = JSON.parse(stdout || "{}");
    } catch {
      return { text: String(stdout || "").trim(), pages: [] };
    }
    return {
      text: typeof result.text === "string" ? result.text : "",
      pages: Array.isArray(result.pages) ? result.pages : [],
    };
  } catch (error) {
    console.error(`[System OCR Error (${platform})]`, error);
    throw new Error(`Native OCR execution failed: ${error.message}`);
  }
}

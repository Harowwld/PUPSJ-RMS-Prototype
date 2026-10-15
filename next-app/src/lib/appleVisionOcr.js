import os from "node:os";
import { requestAppleVisionOcr } from "./appleVisionWorkerClient.js";

/** Runs the persistent native worker on macOS and Windows; Linux uses Tesseract. */
export async function performNativeOcr(filePath) {
  const platform = os.platform();
  if (platform === "darwin" || platform === "win32") return requestAppleVisionOcr(filePath);
  if (platform === "linux") {
    const { performTesseractOcr } = await import("./tesseractOcr.js");
    return performTesseractOcr(filePath);
  }
  throw new Error(`Native offline OCR is only supported on macOS and Windows. Current OS: ${platform}`);
}

/** Retry one transient engine failure or empty recognition result immediately. */
export async function performNativeOcrWithRetry(filePath) {
  if (os.platform() === "darwin" || os.platform() === "win32") {
    return requestAppleVisionOcr(filePath, { attempts: 2 });
  }
  let firstError;
  try {
    const result = await performNativeOcr(filePath);
    if (String(result?.text || "").trim() || result?.pages?.some((page) => page.observations?.length)) {
      return result;
    }
  } catch (error) {
    firstError = error;
  }

  console.warn("[OCR] Empty result or transient failure; retrying once immediately.");
  try {
    const retryResult = await performNativeOcr(filePath);
    if (String(retryResult?.text || "").trim() || retryResult?.pages?.some((page) => page.observations?.length)) {
      return retryResult;
    }
    if (firstError) throw firstError;
    return retryResult;
  } catch (retryError) {
    throw new Error(`OCR failed after one immediate retry: ${retryError?.message || firstError?.message || "No text recognized."}`, { cause: retryError });
  }
}

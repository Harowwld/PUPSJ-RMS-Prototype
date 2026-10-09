import path from "node:path";
import process from "node:process";
import os from "node:os";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const EMPTY_PPM = Buffer.from("P6\n32 32\n255\n" + "\0".repeat(32 * 32 * 3), "binary");

export const WARMUP_PATHS = [
  "/",
  "/login",
  "/systemadmin",
  "/api/auth/me",
  "/api/account/avatar?id=warmup",
  "/api/landing/hero",
  "/api/landing/faq",
  "/api/landing/bento",
  "/api/landing/catalog",
  "/api/landing/workflow",
  "/api/landing/footer",
  "/api/modules",
  "/api/offices?stats=true",
];

export async function warmLocalRoutes(baseUrl = "http://127.0.0.1:3000") {
  const results = await Promise.all(WARMUP_PATHS.map(async (pathname) => {
    try {
      const response = await fetch(new URL(pathname, baseUrl), {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
      return { pathname, ok: response.ok || response.status < 500, status: response.status };
    } catch (error) {
      return { pathname, ok: false, status: 0, error };
    }
  }));

  return {
    warmed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
}

export async function warmOcrEngine() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "pupsj-ocr-warmup-"));
  const imagePath = path.join(tempDir, "warmup.ppm");
  try {
    await writeFile(imagePath, EMPTY_PPM);
    const { performNativeOcr } = await import("../src/lib/appleVisionOcr.js");
    await performNativeOcr(imagePath);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  const result = await warmLocalRoutes(process.env.LOCAL_DEV_URL || "http://127.0.0.1:3000");
  console.log(`[dev] Warmed ${result.warmed}/${WARMUP_PATHS.length} local route surfaces.`);
  const ocr = await warmOcrEngine();
  if (ocr.ok) console.log("[startup] OCR engine warmed.");
  else console.warn(`[startup] OCR engine warmup failed: ${ocr.error.message}`);
}

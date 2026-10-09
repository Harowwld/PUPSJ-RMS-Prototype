import { warmupNativeOcr } from "../src/lib/ocrWarmup.js";

try {
  await warmupNativeOcr();
} catch (error) {
  console.warn(`[OCR] Startup warmup failed; OCR will initialize on the first scan: ${error.message}`);
}

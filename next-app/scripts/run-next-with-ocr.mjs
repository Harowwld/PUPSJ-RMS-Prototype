import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { startAppleVisionOcrService } from "./apple-vision-ocr/service.mjs";
import { assertNextPortAvailable } from "./nextPort.mjs";

const require = createRequire(import.meta.url);
const ocrOptions = process.platform === "win32"
  ? {
      binaryPath: path.join(process.cwd(), "bin", "windows-media-ocr.exe"),
      engineName: "Windows OCR",
    }
  : {};
let stopOcr = { stop: async () => {} };
try {
  await assertNextPortAvailable();
  if (process.platform === "darwin" || process.platform === "win32") {
    stopOcr = await startAppleVisionOcrService(ocrOptions);
  }
} catch (error) {
  console.error(`[next] Startup blocked: ${error.message}`);
  process.exit(1);
}
const nextEnv = { ...process.env };
if (stopOcr.clientEndpoint) {
  nextEnv.PUPSJ_OCR_HOST = stopOcr.clientEndpoint.host;
  nextEnv.PUPSJ_OCR_PORT = String(stopOcr.clientEndpoint.port);
  nextEnv.PUPSJ_OCR_TOKEN = stopOcr.clientEndpoint.token;
}
const next = spawn(process.execPath, [require.resolve("next/dist/bin/next"), ...process.argv.slice(2)], {
  stdio: "inherit",
  env: nextEnv,
});
let stopping = false;

async function stop(signal) {
  if (stopping) return;
  stopping = true;
  if (next.exitCode === null && next.signalCode === null) next.kill(signal);
  await stopOcr.stop();
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => { void stop(signal); });
}

next.once("error", async (error) => {
  console.error(`[next] Could not start Next.js: ${error.message}`);
  await stopOcr.stop();
  process.exitCode = 1;
});

next.once("exit", async (code, signal) => {
  if (!stopping) await stopOcr.stop();
  process.exitCode = code ?? (signal ? 1 : 0);
});

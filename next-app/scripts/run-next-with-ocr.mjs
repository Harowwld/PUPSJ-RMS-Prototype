import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { chmodSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
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

function ensureAppleVisionOcrBinary() {
  const sourcePath = path.join(process.cwd(), "scripts/apple-vision-ocr/ocr.swift");
  const binaryPath = path.join(process.cwd(), "bin/apple-vision-ocr");
  const sourceStat = statSync(sourcePath);
  let binaryStat = null;

  try {
    binaryStat = statSync(binaryPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  if (binaryStat?.isFile() && binaryStat.mtimeMs >= sourceStat.mtimeMs) return;

  mkdirSync(path.dirname(binaryPath), { recursive: true });
  const temporaryBinaryPath = `${binaryPath}.tmp-${process.pid}`;
  rmSync(temporaryBinaryPath, { force: true });
  console.info("[OCR] Building Apple Vision worker from the current Swift source...");

  const result = spawnSync("swiftc", ["-O", sourcePath, "-o", temporaryBinaryPath], { stdio: "inherit" });
  if (result.error || result.status !== 0) {
    rmSync(temporaryBinaryPath, { force: true });
    const reason = result.error?.message || `swiftc exited with code ${result.status ?? "unknown"}`;
    throw new Error(`Could not build the Apple Vision OCR worker: ${reason}. Install Xcode Command Line Tools and retry.`);
  }

  try {
    chmodSync(temporaryBinaryPath, 0o755);
    renameSync(temporaryBinaryPath, binaryPath);
  } catch (error) {
    rmSync(temporaryBinaryPath, { force: true });
    throw new Error(`Could not install the rebuilt Apple Vision OCR worker: ${error.message}`);
  }

  console.info("[OCR] Apple Vision worker build is current.");
}

try {
  await assertNextPortAvailable();
  if (process.platform === "darwin") {
    ensureAppleVisionOcrBinary();
    stopOcr = await startAppleVisionOcrService(ocrOptions);
  } else if (process.platform === "win32") {
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
const nextArgs = [require.resolve("next/dist/bin/next"), ...process.argv.slice(2)];
const keepOcrUntilShutdown = process.argv[2] === "dev";
let next = null;
let stopping = false;
let restartTimer = null;

function launchNext() {
  next = spawn(process.execPath, nextArgs, { stdio: "inherit", env: nextEnv });
  next.once("error", (error) => {
    console.error(`[next] Could not start Next.js: ${error.message}`);
    if (keepOcrUntilShutdown && !stopping) scheduleNextRestart();
    else void stopOcr.stop().finally(() => { process.exitCode = 1; });
  });
  next.once("exit", (code, signal) => {
    if (stopping) {
      process.exitCode = code ?? (signal ? 1 : 0);
      return;
    }
    if (keepOcrUntilShutdown) {
      console.warn(`[next] Next.js exited (code ${code ?? "none"}, signal ${signal ?? "none"}); OCR remains available while RMS is open.`);
      scheduleNextRestart();
      return;
    }
    void stopOcr.stop().finally(() => {
      process.exitCode = code ?? (signal ? 1 : 0);
    });
  });
}

function scheduleNextRestart() {
  if (stopping || restartTimer) return;
  restartTimer = setTimeout(() => {
    restartTimer = null;
    if (!stopping) launchNext();
  }, 1000);
}

launchNext();

async function stop(signal) {
  if (stopping) return;
  stopping = true;
  clearTimeout(restartTimer);
  restartTimer = null;
  if (next && next.exitCode === null && next.signalCode === null) next.kill(signal);
  await stopOcr.stop();
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => { void stop(signal); });
}

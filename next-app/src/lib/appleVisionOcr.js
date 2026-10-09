import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import crypto from "node:crypto";

const WORKER_KEY = Symbol.for("pupsj.nativeOcrWorker");
const QUEUE_KEY = Symbol.for("pupsj.nativeOcrQueue");

function currentWorker() {
  return globalThis[WORKER_KEY] || null;
}

function getWorkerBinary() {
  const platform = os.platform();
  if (platform === "darwin") return path.join(process.cwd(), "bin", "apple-vision-ocr");
  if (platform === "win32") return path.join(process.cwd(), "bin", "windows-media-ocr.exe");
  throw new Error(`Persistent native OCR is only supported on macOS and Windows. Current OS: ${platform}`);
}

function workerBinaryError(platform, binaryPath) {
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

function rejectWorkerRequests(worker, error) {
  for (const request of worker.pending.values()) {
    clearTimeout(request.timeout);
    request.reject(error);
  }
  worker.pending.clear();
}

function handleWorkerResponse(worker, line) {
  let response;
  try {
    response = JSON.parse(line);
  } catch {
    console.warn(`[System OCR Warning (${worker.platform})] Ignoring non-JSON worker output.`);
    return;
  }

  const pending = worker.pending.get(String(response.id || ""));
  if (!pending) return;
  worker.pending.delete(String(response.id));
  clearTimeout(pending.timeout);
  if (!response.ok) {
    pending.reject(new Error(response.error || "Native OCR worker failed to process the file."));
    return;
  }

  const result = response.result || {};
  pending.resolve({
    text: typeof result.text === "string" ? result.text : "",
    pages: Array.isArray(result.pages) ? result.pages : [],
  });
}

export function startNativeOcrWorker() {
  const existing = currentWorker();
  if (existing && !existing.exited) return existing;

  const platform = os.platform();
  const binaryPath = getWorkerBinary();
  if (!fs.existsSync(binaryPath)) throw workerBinaryError(platform, binaryPath);

  const child = spawn(binaryPath, ["--server"], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const worker = {
    child,
    platform,
    pending: new Map(),
    output: Buffer.alloc(0),
    exited: false,
  };
  globalThis[WORKER_KEY] = worker;

  child.stdout.on("data", (chunk) => {
    worker.output = Buffer.concat([worker.output, chunk]);
    while (true) {
      const newline = worker.output.indexOf(0x0a);
      if (newline < 0) break;
      const line = worker.output.subarray(0, newline).toString("utf8").trim();
      worker.output = worker.output.subarray(newline + 1);
      if (!line) continue;
      if (line) handleWorkerResponse(worker, line);
    }
  });
  child.stderr.on("data", (chunk) => {
    const message = String(chunk || "").trim();
    if (message) console.warn(`[System OCR (${platform})] ${message}`);
  });
  child.on("error", (error) => {
    worker.exited = true;
    rejectWorkerRequests(worker, new Error(`Could not start native OCR worker: ${error.message}`));
    if (currentWorker() === worker) globalThis[WORKER_KEY] = null;
  });
  child.on("close", (code, signal) => {
    worker.exited = true;
    const error = new Error(`Native OCR worker exited (code ${code ?? "none"}, signal ${signal || "none"}).`);
    rejectWorkerRequests(worker, error);
    if (currentWorker() === worker) globalThis[WORKER_KEY] = null;
  });

  process.once("exit", () => {
    if (!worker.exited) child.kill();
  });

  return worker;
}

async function stopNativeOcrWorker(worker) {
  if (!worker || worker.exited) return;
  if (currentWorker() === worker) globalThis[WORKER_KEY] = null;
  worker.exited = true;

  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 2000);
    worker.child.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
    if (!worker.child.kill()) {
      clearTimeout(timer);
      resolve();
    }
  });
}

function requestWorkerOcr(worker, filePath) {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.pending.delete(id);
      reject(new Error("Native OCR worker timed out while processing the file."));
    }, 5 * 60 * 1000);
    worker.pending.set(id, { resolve, reject, timeout });
    worker.child.stdin.write(`${JSON.stringify({ id, filePath })}\n`, (error) => {
      if (!error) return;
      worker.pending.delete(id);
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Reuses one native process and its initialized OCR engine for the app lifetime.
 * Linux continues to use the existing Tesseract command-line implementation.
 */
export async function performNativeOcr(filePath) {
  if (os.platform() === "linux") {
    const { performTesseractOcr } = await import("./tesseractOcr.js");
    return performTesseractOcr(filePath);
  }

  const absolutePath = path.resolve(filePath);
  const previousRequest = globalThis[QUEUE_KEY] || Promise.resolve();
  const request = previousRequest.then(async () => {
    let worker = startNativeOcrWorker();
    try {
      return await requestWorkerOcr(worker, absolutePath);
    } catch (error) {
      console.warn(`[System OCR Warning (${worker.platform})] OCR request failed; restarting the worker and retrying once: ${error.message}`);
      await stopNativeOcrWorker(worker);
      worker = startNativeOcrWorker();
      try {
        return await requestWorkerOcr(worker, absolutePath);
      } catch (retryError) {
        await stopNativeOcrWorker(worker);
        throw retryError;
      }
    }
  });
  globalThis[QUEUE_KEY] = request.catch(() => {});
  return request;
}

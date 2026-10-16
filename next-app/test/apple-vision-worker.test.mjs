import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, chmod, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppleVisionOcrService } from "../scripts/apple-vision-ocr/service.mjs";
import { requestAppleVisionOcr } from "../src/lib/appleVisionWorkerClient.js";

const fixturePath = fileURLToPath(new URL("./fixtures/apple-vision-worker.mjs", import.meta.url));

async function createService(t, options = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "pupsj-ocr-test-"));
  const socketPath = path.join(directory, "worker.sock");
  const scanLog = path.join(directory, "scans.log");
  const warmupFailureFile = path.join(directory, "warmup-fail");
  await writeFile(warmupFailureFile, "fail warmup until removed");
  const events = [];
  const service = new AppleVisionOcrService({
    binaryPath: process.execPath,
    workerArgs: [fixturePath],
    workerEnv: {
      ...process.env,
      OCR_TEST_WARMUP_FAILURE_FILE: warmupFailureFile,
      OCR_TEST_SCAN_LOG: scanLog,
    },
    socketPath,
    scanTimeoutMs: 5000,
    warmupRetryBaseMs: 30,
    warmupRetryMaxMs: 60,
    workerRetryBaseMs: 20,
    workerRetryMaxMs: 60,
    onState: (event) => events.push(event),
    ...options,
  });
  service.binaryPath = process.execPath;
  await service.start();
  t.after(async () => {
    await service.stop();
    await rm(directory, { recursive: true, force: true });
  });
  return { service, directory, socketPath, scanLog, warmupFailureFile, events };
}

async function waitFor(predicate, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for OCR worker state");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function requestFromService(service, filePath, options = {}) {
  const transport = service.clientEndpoint
    ? { endpoint: service.clientEndpoint }
    : { socketPath: service.socketPath };
  return requestAppleVisionOcr(filePath, { ...transport, ...options });
}

test("serial scans reuse one worker and the private socket", async (t) => {
  const { service, scanLog } = await createService(t);
  await waitFor(() => service.state === "degraded");
  const results = await Promise.all([
    requestFromService(service, "/tmp/scan-a"),
    requestFromService(service, "/tmp/scan-b"),
  ]);
  assert.equal(results[0].text.split(":")[0], results[1].text.split(":")[0]);
  assert.equal(service.state, "degraded");
  assert.deepEqual((await readFile(scanLog, "utf8")).trim().split("\n"), ["/tmp/scan-a", "/tmp/scan-b"]);
});

test("warmup failure keeps the process and scans alive, then recovery clears degraded state", async (t) => {
  const { service, warmupFailureFile } = await createService(t);
  await waitFor(() => service.state === "degraded");
  const pid = service.child.process.pid;
  const result = await requestFromService(service, "/tmp/scan-during-warmup");
  assert.match(result.text, new RegExp(`^${pid}:`));
  await rm(warmupFailureFile);
  await waitFor(() => service.state === "ready");
  assert.equal(service.child.process.pid, pid);
});

test("a Vision scan error returns after its retry without immediately recycling the worker", async (t) => {
  const { service } = await createService(t);
  await waitFor(() => service.state === "degraded");
  const pid = service.child.process.pid;
  await assert.rejects(
    requestFromService(service, "/tmp/vision-error", { attempts: 2 }),
    /CRImageReaderError/,
  );
  const next = await requestFromService(service, "/tmp/next-scan");
  assert.match(next.text, new RegExp(`^${pid}:`));
});

test("consecutive Vision engine failures recycle an unhealthy worker for later scans", async (t) => {
  const { service } = await createService(t, { consecutiveVisionErrorRestartThreshold: 2 });
  await waitFor(() => service.state === "degraded");
  const originalPid = service.child.process.pid;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await assert.rejects(
      requestFromService(service, "/tmp/vision-error", { attempts: 2 }),
      /CRImageReaderError/,
    );
    if (attempt === 1) assert.equal(service.child.process.pid, originalPid);
  }

  await waitFor(() => service.child?.ready && service.child.process.pid !== originalPid);
  const next = await requestFromService(service, "/tmp/recovered-scan");
  assert.notEqual(Number(next.text.split(":")[0]), originalPid);
  assert.match(next.text, /recovered-scan$/);
});

test("worker crash retries the active scan once on a replacement process", async (t) => {
  const { service, directory } = await createService(t);
  await waitFor(() => service.state === "degraded");
  const originalPid = service.child.process.pid;
  const result = await requestFromService(service, path.join(directory, "crash-once"), { attempts: 2 });
  assert.match(result.text, /crash-once$/);
  assert.notEqual(Number(result.text.split(":")[0]), originalPid);
});

test("a timed out scan is retried once after worker restart", async (t) => {
  const { service, directory } = await createService(t);
  await waitFor(() => service.state === "degraded");
  const startedAt = performance.now();
  const result = await requestFromService(service, path.join(directory, "hang-once"), { attempts: 2 });
  assert.match(result.text, /hang-once$/);
  assert.ok(performance.now() - startedAt >= 4900);
});

test("worker shutdown removes its socket and terminates the native process", async (t) => {
  const { service, socketPath } = await createService(t);
  await waitFor(() => service.child?.ready);
  const child = service.child.process;
  await service.stop();
  await assert.rejects(access(socketPath));
  assert.notEqual(child.exitCode, null);
});

test("a second supervisor cannot remove or replace a live worker socket", async (t) => {
  const { service, socketPath } = await createService(t);
  const second = new AppleVisionOcrService({
    binaryPath: process.execPath,
    workerArgs: [fixturePath],
    socketPath,
  });

  await assert.rejects(second.start(), /supervisor is already running/);
  await access(socketPath);
  const result = await requestFromService(service, "/tmp/after-duplicate-start");
  assert.match(result.text, /^\d+:/);
});

test("Windows uses a token-authenticated loopback endpoint and reuses one worker", async (t) => {
  const { service, scanLog } = await createService(t, { platform: "win32", engineName: "Windows OCR" });
  await waitFor(() => service.state === "degraded");
  assert.equal(service.clientEndpoint.host, "127.0.0.1");
  const pid = service.child.process.pid;

  await assert.rejects(
    requestAppleVisionOcr("/tmp/unauthorized", {
      endpoint: { ...service.clientEndpoint, token: "wrong-token" },
    }),
    /Unauthorized Windows OCR client/,
  );
  const results = await Promise.all([
    requestFromService(service, "/tmp/windows-a"),
    requestFromService(service, "/tmp/windows-b"),
  ]);

  assert.ok(results.every((result) => result.text.startsWith(`${pid}:`)));
  assert.deepEqual((await readFile(scanLog, "utf8")).trim().split("\n"), ["/tmp/windows-a", "/tmp/windows-b"]);
});

test("shutdown during worker startup does not leave a late worker running", async (t) => {
  const { service, socketPath } = await createService(t);
  const child = service.child?.process;
  await service.stop();
  assert.equal(service.state, "stopped");
  await assert.rejects(access(socketPath));
  if (child) assert.notEqual(child.exitCode, null);
});

test("missing worker binary retries startup and serves a queued scan when installed", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "pupsj-ocr-retry-test-"));
  const binaryPath = path.join(directory, "worker");
  const socketPath = path.join(directory, "worker.sock");
  const service = new AppleVisionOcrService({
    binaryPath,
    workerArgs: [fixturePath],
    workerEnv: { ...process.env, OCR_TEST_WARMUP_FAILURE_FILE: path.join(directory, "no-warmup-failure") },
    socketPath,
    workerRetryBaseMs: 20,
    workerRetryMaxMs: 40,
    warmupRetryBaseMs: 30,
    warmupRetryMaxMs: 60,
  });
  await service.start();
  t.after(async () => {
    await service.stop();
    await rm(directory, { recursive: true, force: true });
  });
  const pending = requestFromService(service, "/tmp/queued-before-install");
  await new Promise((resolve) => setTimeout(resolve, 120));
  await writeFile(binaryPath, `#!/bin/sh\nexec ${process.execPath} ${fixturePath}\n`);
  await chmod(binaryPath, 0o700);
  assert.match((await pending).text, /queued-before-install$/);
});

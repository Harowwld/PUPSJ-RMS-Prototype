import net from "node:net";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { randomUUID, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, lstat, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { getAppleVisionSocketPath } from "../../src/lib/appleVisionWorkerClient.js";

class WorkerLostError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorkerLostError";
  }
}

class WorkerTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorkerTimeoutError";
  }
}

class VisionRecognitionError extends Error {
  constructor(message) {
    super(message);
    this.name = "VisionRecognitionError";
  }
}

export class AppleVisionOcrService {
  constructor({
    binaryPath = path.join(process.cwd(), "bin/apple-vision-ocr"),
    workerArgs = ["--worker"],
    workerEnv = process.env,
    socketPath = getAppleVisionSocketPath(),
    platform = process.platform,
    engineName = platform === "win32" ? "Windows OCR" : "Apple Vision",
    scanTimeoutMs = 5000,
    warmupRetryBaseMs = 5000,
    warmupRetryMaxMs = 60000,
    workerRetryBaseMs = 1000,
    workerRetryMaxMs = 60000,
    consecutiveVisionErrorRestartThreshold = 3,
    onState = () => {},
  } = {}) {
    Object.assign(this, {
      binaryPath, workerArgs, workerEnv, socketPath, scanTimeoutMs,
      platform, engineName,
      warmupRetryBaseMs, warmupRetryMaxMs,
      workerRetryBaseMs, workerRetryMaxMs,
      consecutiveVisionErrorRestartThreshold, onState,
    });
    this.stopped = false;
    this.state = "starting";
    this.scans = [];
    this.warmups = [];
    this.sockets = new Set();
    this.warmupDelayMs = warmupRetryBaseMs;
    this.workerDelayMs = workerRetryBaseMs;
    this.warmupTimer = null;
    this.consecutiveVisionErrors = 0;
  }

  setState(state, detail = "") {
    if (this.state === state && !detail) return;
    this.state = state;
    this.onState({ state, detail });
    if (detail) console.info(`[OCR] ${detail}`);
  }

  async start() {
    if (this.platform === "darwin") await this.removeStaleSocket();
    this.server = net.createServer((socket) => this.accept(socket));
    await new Promise((resolve, reject) => {
      this.server.once("error", reject);
      if (this.platform === "win32") this.server.listen({ host: "127.0.0.1", port: 0 }, resolve);
      else this.server.listen(this.socketPath, resolve);
    });
    if (this.platform === "win32") {
      const address = this.server.address();
      this.clientEndpoint = {
        host: "127.0.0.1",
        port: address.port,
        token: randomBytes(32).toString("hex"),
      };
    } else {
      await chmod(this.socketPath, 0o600);
    }
    void this.ensureWorker().catch(() => {});
    return this;
  }

  async removeStaleSocket() {
    let info;
    try {
      info = await lstat(this.socketPath);
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    const uid = typeof process.getuid === "function" ? process.getuid() : info.uid;
    if (!info.isSocket() || info.uid !== uid) throw new Error("Refusing to remove a non-owned OCR socket path");
    await new Promise((resolve, reject) => {
      const probe = net.createConnection(this.socketPath);
      probe.once("connect", () => {
        probe.destroy();
        reject(new Error(`An ${this.engineName} OCR supervisor is already running for this workspace`));
      });
      probe.once("error", (error) => {
        probe.destroy();
        if (error.code === "ECONNREFUSED" || error.code === "ENOENT") resolve();
        else reject(error);
      });
    });
    await unlink(this.socketPath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }

  accept(socket) {
    this.sockets.add(socket);
    socket.setEncoding("utf8");
    socket.on("error", () => {});
    socket.once("close", () => this.sockets.delete(socket));
    let input = "";
    const receive = (chunk) => {
      input += chunk;
      if (input.length > 65536) return socket.destroy();
      const end = input.indexOf("\n");
      if (end < 0) return;
      socket.off("data", receive);
      let request;
      try {
        request = JSON.parse(input.slice(0, end));
        if (this.platform === "win32" && !this.hasValidClientToken(request.token)) {
          throw new Error("Unauthorized Windows OCR client");
        }
        if (typeof request.filePath !== "string" || !path.isAbsolute(request.filePath)) {
          throw new Error("OCR request requires an absolute file path");
        }
      } catch (error) {
        socket.end(`${JSON.stringify({ error: error.message })}\n`);
        return;
      }
      this.enqueueScan(request.filePath, request.attempts === 2 ? 2 : 1)
        .then((result) => {
          if (!socket.destroyed) socket.end(`${JSON.stringify({ result })}\n`);
        })
        .catch((error) => {
          if (!socket.destroyed) socket.end(`${JSON.stringify({ error: error.message })}\n`);
        });
    };
    socket.on("data", receive);
  }

  hasValidClientToken(token) {
    if (typeof token !== "string" || !this.clientEndpoint?.token) return false;
    const provided = Buffer.from(token);
    const expected = Buffer.from(this.clientEndpoint.token);
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  }

  enqueueScan(filePath, attempts = 1) {
    if (this.stopped) return Promise.reject(new Error("OCR supervisor is stopping"));
    return new Promise((resolve, reject) => {
      this.scans.push({ filePath, attempts, resolve, reject });
      void this.pump();
    });
  }

  enqueueWarmup() {
    if (this.stopped) return;
    this.warmups.push({});
    void this.pump();
  }

  async pump() {
    if (this.processing || this.stopped) return;
    const job = this.scans.shift() || this.warmups.shift();
    if (!job) return;
    this.processing = true;
    try {
      if ("filePath" in job) job.resolve(await this.runScan(job.filePath, job.attempts));
      else await this.runWarmup();
    } catch (error) {
      if ("filePath" in job) job.reject(error);
      else this.scheduleWarmupRetry(error);
    } finally {
      this.processing = false;
      void this.pump();
    }
  }

  async runScan(filePath, attempts) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const child = await this.ensureWorker();
        await this.initialWarmup;
        if (!child.ready) throw new WorkerLostError(`${this.engineName} worker exited during startup warmup`);
        const response = await this.send(child, { type: "scan", id: randomUUID(), filePath }, this.scanTimeoutMs);
        if (!response.ok) throw new VisionRecognitionError(response.error || `${this.engineName} scan failed`);
        const result = response.result;
        if (!result || typeof result.text !== "string" || !Array.isArray(result.pages)) {
          throw new WorkerLostError(`${this.engineName} worker returned an invalid scan response`);
        }
        if (attempt < attempts && !result.text.trim() && !result.pages.some((page) => page.observations?.length)) {
          lastError = new Error(`${this.engineName} returned no text or observations`);
          continue;
        }
        this.consecutiveVisionErrors = 0;
        return result;
      } catch (error) {
        lastError = error;
        if (error instanceof WorkerLostError || error instanceof WorkerTimeoutError) {
          await this.recycleWorker(error.message);
        }
      }
    }
    if (lastError instanceof VisionRecognitionError) {
      this.consecutiveVisionErrors += 1;
      if (this.consecutiveVisionErrors >= this.consecutiveVisionErrorRestartThreshold) {
        this.consecutiveVisionErrors = 0;
        await this.recycleWorker(`Repeated ${this.engineName} recognition errors`);
      }
    }
    throw new Error(`OCR failed after ${attempts} attempt(s): ${lastError?.message || "No text recognized."}`, { cause: lastError });
  }

  async runWarmup() {
    try {
      const workerWasReady = this.child?.ready === true;
      const child = await this.ensureWorker();
      if (workerWasReady) await this.performWarmup(child);
      else await this.initialWarmup;
    } catch (error) {
      if (this.stopped) return;
      this.setState("degraded", `${this.engineName} warmup failed; scans remain enabled: ${error.message}`);
      this.scheduleWarmupRetry(error);
    }
  }

  async performWarmup(child) {
    try {
      const response = await this.send(child, { type: "warmup", id: randomUUID() });
      if (!response.ok) throw new Error(response.error || "Vision warmup failed");
      this.warmupDelayMs = this.warmupRetryBaseMs;
      this.setState("ready", `${this.engineName} warmup completed successfully.`);
    } catch (error) {
      if (this.stopped) return;
      this.setState("degraded", `${this.engineName} warmup failed; scans remain enabled: ${error.message}`);
      this.scheduleWarmupRetry(error);
    }
  }

  scheduleWarmupRetry(error) {
    if (this.stopped || this.warmupTimer) return;
    if (this.state !== "degraded") {
      this.setState("degraded", `${this.engineName} warmup failed; scans remain enabled: ${error.message}`);
    }
    const waitMs = this.warmupDelayMs;
    this.warmupDelayMs = Math.min(this.warmupDelayMs * 2, this.warmupRetryMaxMs);
    this.warmupTimer = setTimeout(() => {
      this.warmupTimer = null;
      this.enqueueWarmup();
    }, waitMs);
    this.warmupTimer.unref?.();
  }

  ensureWorker() {
    if (this.stopped) return Promise.reject(new Error("OCR supervisor is stopping"));
    if (this.child?.ready) return Promise.resolve(this.child);
    if (this.startingWorker) return this.startingWorker;
    this.startingWorker = this.startWorkerWithRetry().finally(() => {
      this.startingWorker = null;
    });
    return this.startingWorker;
  }

  async startWorkerWithRetry() {
    while (!this.stopped) {
      try {
        const child = await this.spawnWorker();
        if (this.stopped) {
          child.process.stdin.end();
          throw new Error("OCR supervisor stopped during worker startup");
        }
        this.workerDelayMs = this.workerRetryBaseMs;
        clearTimeout(this.warmupTimer);
        this.warmupTimer = null;
        this.warmupDelayMs = this.warmupRetryBaseMs;
        // Every new worker gets its startup warmup; discard retries that were
        // queued for the worker this process just replaced.
        this.warmups.length = 0;
        this.setState(this.state === "degraded" ? "degraded" : "warming", `${this.engineName} worker started (PID ${child.process.pid}).`);
        this.initialWarmup = this.performWarmup(child);
        return child;
      } catch (error) {
        if (this.stopped) break;
        this.setState("starting", `Could not start ${this.engineName} worker; retrying: ${error.message}`);
        await delay(this.workerDelayMs).catch(() => {});
        this.workerDelayMs = Math.min(this.workerDelayMs * 2, this.workerRetryMaxMs);
      }
    }
    throw new Error("OCR supervisor stopped before the worker became available");
  }

  spawnWorker() {
    return new Promise((resolve, reject) => {
      const process = spawn(this.binaryPath, this.workerArgs, { env: this.workerEnv, stdio: ["pipe", "pipe", "pipe"] });
      const lines = createInterface({ input: process.stdout });
      const close = new Promise((done) => process.once("close", done));
      const worker = { process, lines, close, ready: false };
      this.child = worker;
      let settled = false;
      const failStartup = (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };
      process.stderr.on("data", (chunk) => {
        const message = chunk.toString().trim();
        if (message) console.warn(`[OCR] ${message}`);
      });
      process.once("error", (error) => failStartup(error));
      process.once("close", (code, signal) => {
        lines.close();
        worker.ready = false;
        if (this.child === worker) this.child = null;
        const lost = new WorkerLostError(`${this.engineName} worker exited (code ${code ?? "signal"} ${signal || ""})`);
        if (this.pending?.worker === worker) this.pending.reject(lost);
        failStartup(lost);
        if (!this.stopped) {
          this.setState("starting", `${lost.message}; queued scans will retry.`);
          setImmediate(() => { void this.ensureWorker().catch(() => {}); });
        }
      });
      process.stdin.on("error", (error) => {
        if (this.pending?.worker === worker) this.pending.reject(new WorkerLostError(error.message));
      });
      lines.on("line", (line) => {
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          if (this.pending?.worker === worker) this.pending.reject(new WorkerLostError(`${this.engineName} worker emitted invalid JSON`));
          else failStartup(new WorkerLostError(`${this.engineName} worker emitted invalid startup data`));
          return;
        }
        if (message.type === "ready" && !settled) {
          settled = true;
          worker.ready = true;
          resolve(worker);
          return;
        }
        if (this.pending?.worker === worker && message.id === this.pending.id) {
          this.pending.resolve(message);
        }
      });
    });
  }

  send(worker, command, timeoutMs = null) {
    if (this.pending) return Promise.reject(new Error("OCR worker received overlapping commands"));
    return new Promise((resolve, reject) => {
      const pending = { worker, id: command.id, resolve, reject, timer: null };
      this.pending = pending;
      const finish = (fn, value) => {
        if (this.pending !== pending) return;
        clearTimeout(pending.timer);
        this.pending = null;
        fn(value);
      };
      pending.resolve = (value) => finish(resolve, value);
      pending.reject = (error) => finish(reject, error);
      if (timeoutMs) {
        pending.timer = setTimeout(() => {
          pending.reject(new WorkerTimeoutError(`OCR scan attempt exceeded ${timeoutMs / 1000} seconds`));
        }, timeoutMs);
      }
      worker.process.stdin.write(`${JSON.stringify(command)}\n`, (error) => {
        if (error) pending.reject(new WorkerLostError(error.message));
      });
    });
  }

  async recycleWorker(reason) {
    const worker = this.child;
    if (!worker) return;
    this.setState("starting", `${reason}; restarting ${this.engineName} worker.`);
    if (worker.process.exitCode === null && worker.process.signalCode === null) {
      worker.process.kill("SIGKILL");
    }
    await worker.close;
  }

  async stop() {
    if (this.stopped) return;
    this.stopped = true;
    clearTimeout(this.warmupTimer);
    this.warmupTimer = null;
    this.setState("stopping", `Stopping ${this.engineName} worker.`);
    for (const socket of this.sockets) socket.destroy();
    this.scans.splice(0).forEach((job) => job.reject(new Error("OCR supervisor stopped")));
    this.warmups.length = 0;
    const worker = this.child;
    if (worker && worker.process.exitCode === null && worker.process.signalCode === null) {
      worker.process.stdin.end();
      const grace = delay(2000).then(() => {
        if (worker.process.exitCode === null && worker.process.signalCode === null) worker.process.kill("SIGKILL");
      });
      await Promise.race([worker.close, grace]);
    }
    await new Promise((resolve) => this.server?.close(resolve));
    if (this.platform !== "win32") {
      await unlink(this.socketPath).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
    this.setState("stopped");
  }
}

export async function startAppleVisionOcrService(options = {}) {
  const service = new AppleVisionOcrService(options);
  await service.start();
  return service;
}

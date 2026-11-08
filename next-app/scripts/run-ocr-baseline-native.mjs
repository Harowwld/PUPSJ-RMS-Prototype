import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { cp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { encryptPII } from "../src/lib/piiEncryption.js";
import { hashPassword } from "../src/lib/passwordHash.js";
import { withDisposableEnvironment } from "./testing/environment.mjs";
import { startAppleVisionOcrService } from "./apple-vision-ocr/service.mjs";

if (process.platform !== "darwin") throw new Error("This isolated wrapper uses the host's Apple Vision worker. Windows Media and Linux/Tesseract require their own native runner.");
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.dirname(appRoot);
const { Pool } = pg;
process.env.PATH = `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH || ""}`;

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}
async function waitForApp(baseURL, child) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Isolated native test app exited with code ${child.exitCode}`);
    try {
      const response = await fetch(baseURL, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Isolated native test app did not become ready within 90 seconds");
}
function stopProcess(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  child.kill("SIGTERM");
  return Promise.race([
    new Promise((resolve) => child.once("close", resolve)),
    new Promise((resolve) => setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 5000)),
  ]);
}

await withDisposableEnvironment(async ({ env, runId }) => {
  process.env.JWT_SECRET = env.JWT_SECRET;
  if (env.PII_ENCRYPTION_KEY) process.env.PII_ENCRYPTION_KEY = env.PII_ENCRYPTION_KEY;
  const email = "ocr-baseline.synthetic@pup.local";
  const password = `OCR-${runId.slice(0, 12)}-Synthetic!`;
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    await pool.query(`
      INSERT INTO staff (id, office_id, fname, lname, role, section, status, email, password_hash, password_last_changed, updated_at)
      VALUES ($1, 'registrar', $2, $3, 'Staff', 'OCR Baseline Synthetic', 'Active', $4, $5, NOW(), NOW())
    `, ["PUP-OCR-BASELINE", encryptPII("Synthetic"), encryptPII("Baseline"), encryptPII(email), hashPassword(password)]);
  } finally {
    await pool.end();
  }

  const isolatedAppRoot = path.join(workspaceRoot, ".test-runs", `ocr-baseline-${runId}`);
  const markerPath = path.join(isolatedAppRoot, ".pupsj-ocr-baseline-run");
  await mkdir(path.join(workspaceRoot, ".test-runs"), { recursive: true });
  await mkdir(isolatedAppRoot, { recursive: false });
  let server;
  let ocrService;
  try {
    await cp(appRoot, isolatedAppRoot, {
      recursive: true,
      filter: (source) => {
        const relative = path.relative(appRoot, source);
        if (!relative) return true;
        return !new Set(["node_modules", ".next", ".local", ".git", ".test-runs", "coverage", "test-results"]).has(relative.split(path.sep)[0]);
      },
    });
    await symlink(path.join(appRoot, "node_modules"), path.join(isolatedAppRoot, "node_modules"), "dir");
    const nextConfigPath = path.join(isolatedAppRoot, "next.config.mjs");
    const nextConfig = await readFile(nextConfigPath, "utf8");
    await writeFile(nextConfigPath, nextConfig.replace("root: __dirname,", `root: ${JSON.stringify(workspaceRoot)},`));
    await writeFile(markerPath, `${runId}\n`, { flag: "wx", mode: 0o600 });

    const port = await freePort();
    const baseURL = `http://127.0.0.1:${port}`;
    const appEnv = {
      ...env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      TEST_BASE_URL: baseURL,
      TEST_RUN_ID: runId,
    };
    const isolatedCwd = isolatedAppRoot;
    const uid = typeof process.getuid === "function" ? process.getuid() : process.pid;
    const socketPath = path.join(os.tmpdir(), `pupsj-ocr-${uid}-${createHash("sha256").update(isolatedCwd).digest("hex").slice(0, 16)}.sock`);
    ocrService = await startAppleVisionOcrService({
      binaryPath: path.join(isolatedAppRoot, "bin/apple-vision-ocr"),
      socketPath,
      platform: "darwin",
      engineName: "Apple Vision",
    });
    server = spawn(process.execPath, [path.join(isolatedAppRoot, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: isolatedAppRoot,
      env: appEnv,
      stdio: "inherit",
      windowsHide: true,
    });
    await waitForApp(baseURL, server);

    const runnerEnv = { ...env, OCR_BASE_URL: baseURL, OCR_USERNAME: email, OCR_PASSWORD: password };
    const runner = spawn(process.execPath, [path.join(appRoot, "scripts/run-ocr-baseline.mjs"), "--live-ocr"], {
      cwd: appRoot, env: runnerEnv, stdio: "inherit", windowsHide: true,
    });
    const exit = await new Promise((resolve, reject) => {
      runner.once("error", reject);
      runner.once("exit", (code, signal) => resolve({ code, signal }));
    });
    if (exit.code !== 0) throw new Error(`Native baseline runner exited with ${exit.signal || exit.code}`);
    process.stdout.write(`Native OCR run used isolated database/app ${runId}; the synthetic staff account and app files were discarded.\n`);
  } finally {
    await stopProcess(server);
    await ocrService?.stop();
    try {
      if ((await readFile(markerPath, "utf8")).trim() === runId && path.dirname(isolatedAppRoot) === path.join(workspaceRoot, ".test-runs")) {
        await rm(isolatedAppRoot, { recursive: true, force: false });
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
});

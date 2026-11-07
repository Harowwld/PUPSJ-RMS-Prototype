import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: ".env" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const databaseName = `pupsj_watcher_verify_${process.pid}`;
const sourceUrl = new URL(process.env.DATABASE_URL);
const testUrl = new URL(sourceUrl);
testUrl.pathname = `/${databaseName}`;
const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "pupsj-watcher-"));
const adminPool = new Pool({ connectionString: sourceUrl.toString(), max: 1 });
const received = [];
const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("latin1");
  const officeId = /name="officeId"\r\n\r\n([^\r]+)/.exec(body)?.[1];
  if (!officeId || request.headers.authorization !== "Bearer watcher-test-token") {
    response.writeHead(401, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "Unexpected watcher request" }));
    return;
  }
  received.push(officeId);
  response.writeHead(201, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ ok: true, data: { id: received.length } }));
});

const waitFor = async (condition, label) => {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
};

let databaseCreated = false;
let watcher = null;
let testPool = null;
let watcherLog = "";
try {
  await adminPool.query(`CREATE DATABASE ${databaseName}`);
  databaseCreated = true;
  const testEnv = { ...process.env, DATABASE_URL: testUrl.toString(), LOCAL_DATA_DIR: dataDir };
  execFileSync(process.execPath, ["scripts/run-migrations.mjs"], { env: testEnv, stdio: "pipe" });
  testPool = new Pool({ connectionString: testUrl.toString(), max: 1 });
  await testPool.query("UPDATE offices SET last_station_ping = NULL WHERE id IN ('registrar', 'osas')");
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const apiUrl = `http://127.0.0.1:${server.address().port}/ingest`;
  const hotFolderRoot = path.join(dataDir, "hot-folder");
  watcher = spawn(process.execPath, ["scripts/hot-folder-watcher/watch.mjs"], {
    cwd: process.cwd(),
    env: {
      ...testEnv,
      HOT_FOLDER_ROOT: hotFolderRoot,
      HOT_FOLDER_API_URL: apiUrl,
      HOT_FOLDER_INGEST_TOKEN: "watcher-test-token",
      HOT_FOLDER_SOURCE_STATION: "Verification Scanner",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [watcher.stdout, watcher.stderr]) {
    stream.on("data", (chunk) => { watcherLog = (watcherLog + chunk.toString()).slice(-4000); });
  }
  await waitFor(async () => {
    if (watcher.exitCode !== null || watcher.signalCode !== null) throw new Error(`Watcher exited: ${watcherLog}`);
    const result = await testPool.query("SELECT count(*)::int AS ready FROM offices WHERE id IN ('registrar', 'osas') AND last_station_ping IS NOT NULL");
    return result.rows[0].ready === 2;
  }, "both office watchers").catch((error) => { throw new Error(`${error.message}\n${watcherLog}`); });

  await fs.writeFile(path.join(hotFolderRoot, "registrar", "INBOUND", "registrar-scan.pdf"), "%PDF-1.4\nRegistrar test");
  await fs.writeFile(path.join(hotFolderRoot, "osas", "INBOUND", "osas-scan.pdf"), "%PDF-1.4\nOSAS test");
  await waitFor(() => received.length === 2, "both scanner uploads");
  assert.deepEqual(received.sort(), ["osas", "registrar"]);
  console.log("[watcher-check] Two office scans reached the local ingest endpoint with separate office IDs.");
} finally {
  if (watcher) {
    watcher.kill("SIGTERM");
    await new Promise((resolve) => {
      if (watcher.exitCode !== null) return resolve();
      watcher.once("exit", resolve);
      setTimeout(() => { watcher.kill("SIGKILL"); resolve(); }, 3000).unref();
    });
  }
  if (server.listening) await new Promise((resolve) => server.close(resolve));
  if (testPool) await testPool.end();
  if (databaseCreated) await adminPool.query(`DROP DATABASE ${databaseName} WITH (FORCE)`);
  await adminPool.end();
  await fs.rm(dataDir, { recursive: true, force: true });
}

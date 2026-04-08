import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import chokidar from "chokidar";

const nextAppRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(nextAppRoot, ".env") });
dotenv.config({ path: path.join(nextAppRoot, ".env.local"), override: true });

const API_URL = String(process.env.HOT_FOLDER_API_URL || "http://localhost:3000/api/ingest/hot-folder").trim();
const TOKEN = String(process.env.HOT_FOLDER_INGEST_TOKEN || "").trim();
const SOURCE_STATION = String(process.env.HOT_FOLDER_SOURCE_STATION || "Scanner-PC").trim();
const ROOT_DIR = path.resolve(process.env.HOT_FOLDER_ROOT || path.join(process.cwd(), ".local", "hot-folder"));
const INBOUND_DIR = path.join(ROOT_DIR, "INBOUND");
const PROCESSING_DIR = path.join(ROOT_DIR, "PROCESSING");
const DONE_DIR = path.join(ROOT_DIR, "DONE");
const FAILED_DIR = path.join(ROOT_DIR, "FAILED");

for (const dir of [INBOUND_DIR, PROCESSING_DIR, DONE_DIR, FAILED_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

if (!TOKEN) {
  console.error("[hot-folder] Missing HOT_FOLDER_INGEST_TOKEN");
  process.exit(1);
}

const inFlight = new Set();
const pending = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForStableFile(filePath, maxWaitMs = 20000) {
  const start = Date.now();
  let prevSize = -1;
  while (Date.now() - start < maxWaitMs) {
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return false;
    }
    if (stat.size > 0 && stat.size === prevSize) return true;
    prevSize = stat.size;
    await sleep(800);
  }
  return false;
}

async function sendToIngest(absPath, originalName) {
  const bytes = fs.readFileSync(absPath);
  const file = new File([bytes], originalName);
  const form = new FormData();
  form.set("file", file);
  form.set("sourceStation", SOURCE_STATION);
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json.data;
}

async function processOne(filePath) {
  const fileName = path.basename(filePath);
  if (inFlight.has(filePath)) return;
  inFlight.add(filePath);
  try {
    const stable = await waitForStableFile(filePath);
    if (!stable) throw new Error("File is not stable after waiting");
    const processingPath = path.join(PROCESSING_DIR, `${Date.now()}-${fileName}`);
    fs.renameSync(filePath, processingPath);
    try {
      const row = await sendToIngest(processingPath, fileName);
      const donePath = path.join(DONE_DIR, path.basename(processingPath));
      fs.renameSync(processingPath, donePath);
      console.log(`[hot-folder] Uploaded ${fileName} -> ingest #${row.id}`);
    } catch (e) {
      const failedPath = path.join(FAILED_DIR, path.basename(processingPath));
      fs.renameSync(processingPath, failedPath);
      console.error(`[hot-folder] Failed ${fileName}: ${e.message}`);
    }
  } catch (e) {
    console.error(`[hot-folder] Error ${fileName}: ${e.message}`);
  } finally {
    inFlight.delete(filePath);
  }
}

function scheduleProcess(filePath) {
  const key = path.resolve(filePath);
  clearTimeout(pending.get(key));
  const timer = setTimeout(() => {
    pending.delete(key);
    processOne(key);
  }, 400);
  pending.set(key, timer);
}

console.log(`[hot-folder] Watching ${INBOUND_DIR}`);
const watcher = chokidar.watch(INBOUND_DIR, {
  ignoreInitial: false,
  awaitWriteFinish: {
    stabilityThreshold: 1200,
    pollInterval: 100,
  },
});

watcher.on("add", scheduleProcess);
watcher.on("change", scheduleProcess);
watcher.on("error", (err) => {
  console.error("[hot-folder] watcher error:", err?.message || err);
});

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import chokidar from "chokidar";
import { Pool } from "pg";
import { getOfficeHotFolderDirs } from "../../src/lib/officePaths.js";
import { waitForStableFile } from "./fileStability.mjs";
import { cleanupDoneFiles } from "./cleanup.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(appRoot, ".env") });

const API_URL = String(process.env.HOT_FOLDER_API_URL || "http://localhost:3000/api/ingest/hot-folder").trim();
const TOKEN = String(process.env.HOT_FOLDER_INGEST_TOKEN || "").trim();
const SOURCE_STATION = String(process.env.HOT_FOLDER_SOURCE_STATION || "Scanner-PC").trim();
const SUPPORTED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp", ".heic", ".heif"]);

if (!TOKEN || !process.env.DATABASE_URL) {
  console.error("[hot-folder] HOT_FOLDER_INGEST_TOKEN and DATABASE_URL are required");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 3000 });
const offices = new Map();
let refreshing = false;

function shouldIgnore(filePath) {
  const name = path.basename(filePath);
  return name.startsWith(".") || name.startsWith("#") || name.endsWith("~") || !SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase());
}

async function sendToIngest(officeId, filePath, originalName) {
  const file = new File([fs.readFileSync(filePath)], originalName);
  const form = new FormData();
  form.set("file", file);
  form.set("sourceStation", SOURCE_STATION);
  form.set("officeId", officeId);
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || `HTTP ${response.status}`);
  return result.data;
}

async function processOne(context, filePath) {
  if (shouldIgnore(filePath) || context.inFlight.has(filePath)) return;
  context.inFlight.add(filePath);
  try {
    if (!await waitForStableFile(filePath)) throw new Error("File is not stable after waiting");
    if (!fs.existsSync(filePath)) return;

    const fileName = path.basename(filePath);
    const processingPath = path.join(context.dirs.processing, `${Date.now()}-${fileName}`);
    fs.renameSync(filePath, processingPath);
    try {
      const row = await sendToIngest(context.officeId, processingPath, fileName);
      fs.renameSync(processingPath, path.join(context.dirs.done, path.basename(processingPath)));
      cleanupDoneFiles(context.dirs.done);
      console.log(`[hot-folder] ${context.officeId}: uploaded ${fileName} as ingest #${row.id}`);
    } catch (error) {
      fs.renameSync(processingPath, path.join(context.dirs.failed, path.basename(processingPath)));
      console.error(`[hot-folder] ${context.officeId}: failed ${fileName}: ${error.message}`);
    }
  } catch (error) {
    console.error(`[hot-folder] ${context.officeId}: ${path.basename(filePath)}: ${error.message}`);
  } finally {
    context.inFlight.delete(filePath);
  }
}

function scheduleProcess(context, filePath) {
  if (shouldIgnore(filePath)) return;
  const absolute = path.resolve(filePath);
  clearTimeout(context.pending.get(absolute));
  context.pending.set(absolute, setTimeout(() => {
    context.pending.delete(absolute);
    void processOne(context, absolute);
  }, 250));
}

function scanExistingFiles(context) {
  for (const name of fs.readdirSync(context.dirs.inbound)) {
    scheduleProcess(context, path.join(context.dirs.inbound, name));
  }
}

function startOffice(officeId, dirs = getOfficeHotFolderDirs(officeId), key = officeId) {
  Object.values(dirs).forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
  cleanupDoneFiles(dirs.done);
  const context = { officeId, key, dirs, pending: new Map(), inFlight: new Set(), watcher: null, ready: false, failed: false };
  const watcher = chokidar.watch(dirs.inbound, {
    ignoreInitial: true,
    usePolling: true,
    interval: 200,
    binaryInterval: 200,
    ignored: (filePath) => {
      const name = path.basename(filePath);
      return name.startsWith(".") || name.startsWith("#") || name.endsWith("~");
    },
  });
  context.watcher = watcher;
  watcher.on("add", (filePath) => scheduleProcess(context, filePath));
  watcher.on("change", (filePath) => scheduleProcess(context, filePath));
  watcher.on("ready", () => {
    context.ready = true;
    context.failed = false;
    try {
      scanExistingFiles(context);
    } catch (error) {
      context.ready = false;
      context.failed = true;
      console.error(`[hot-folder] ${officeId}: could not scan inbound folder: ${error.message}`);
    }
    void pool.query("UPDATE offices SET last_station_ping = NOW() WHERE id = $1", [officeId])
      .catch((error) => console.error(`[hot-folder] ${officeId}: heartbeat failed: ${error.message}`));
  });
  watcher.on("error", (error) => {
    context.ready = false;
    context.failed = true;
    console.error(`[hot-folder] ${officeId}: watcher error: ${error.message}`);
  });
  watcher.on("unlinkDir", (removedDir) => {
    if (path.resolve(removedDir) === path.resolve(dirs.inbound)) {
      context.ready = false;
      context.failed = true;
      console.error(`[hot-folder] ${officeId}: inbound folder was removed: ${dirs.inbound}`);
    }
  });
  offices.set(key, context);
  console.log(`[hot-folder] ${officeId}: watching ${dirs.inbound}`);
}

async function stopOffice(context) {
  await context.watcher.close();
  const pendingPaths = [...context.pending.keys()];
  context.pending.forEach(clearTimeout);
  context.pending.clear();
  await Promise.allSettled(pendingPaths.map((filePath) => processOne(context, filePath)));
  while (context.inFlight.size) await new Promise((resolve) => setTimeout(resolve, 100));
  offices.delete(context.key);
}

async function refreshOffices() {
  if (refreshing) return;
  refreshing = true;
  try {
    const result = await pool.query("SELECT id FROM offices WHERE status = 'Active'");
    const active = new Set(result.rows.map((row) => String(row.id).toLowerCase()));
    for (const officeId of active) if (!offices.has(officeId)) startOffice(officeId);
    for (const context of [...offices.values()]) {
      if (!active.has(context.officeId)) await stopOffice(context);
      else if (context.failed || !fs.existsSync(context.dirs.inbound)) {
        await stopOffice(context);
        startOffice(context.officeId, context.dirs, context.key);
      }
    }
    for (const context of offices.values()) {
      if (context.ready) await pool.query("UPDATE offices SET last_station_ping = NOW() WHERE id = $1", [context.officeId]);
    }
  } finally {
    refreshing = false;
  }
}

await refreshOffices();
setInterval(() => refreshOffices().catch((error) => console.error(`[hot-folder] Office refresh failed: ${error.message}`)), 10000);
setInterval(() => offices.forEach((context) => cleanupDoneFiles(context.dirs.done)), 60000);

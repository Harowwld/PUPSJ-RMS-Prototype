import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import chokidar from "chokidar";
import { Pool } from "pg";

const nextAppRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(nextAppRoot, ".env") });
dotenv.config({ path: path.join(nextAppRoot, ".env.local"), override: true });

const API_URL = String(process.env.HOT_FOLDER_API_URL || "http://localhost:3000/api/ingest/hot-folder").trim();
const TOKEN = String(process.env.HOT_FOLDER_INGEST_TOKEN || "").trim();
const SOURCE_STATION = String(process.env.HOT_FOLDER_SOURCE_STATION || "Scanner-PC").trim();
const OFFICE_ID = String(process.env.HOT_FOLDER_OFFICE_ID || "registrar").trim().toLowerCase();
const DEFAULT_INBOUND_DIR = path.resolve(process.env.HOT_FOLDER_ROOT
  ? path.join(process.env.HOT_FOLDER_ROOT, "INBOUND")
  : path.join(process.cwd(), ".local", "hot-folder", "INBOUND"));
let INBOUND_DIR = DEFAULT_INBOUND_DIR;
let PROCESSING_DIR = path.join(path.dirname(INBOUND_DIR), "PROCESSING");
let DONE_DIR = path.join(path.dirname(INBOUND_DIR), "DONE");
let FAILED_DIR = path.join(path.dirname(INBOUND_DIR), "FAILED");

function ensureHotFolderDirs() {
  for (const dir of [INBOUND_DIR, PROCESSING_DIR, DONE_DIR, FAILED_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function readConfiguredInboundDir() {
  if (process.env.HOT_FOLDER_ROOT) return DEFAULT_INBOUND_DIR;
  if (!process.env.DATABASE_URL) return DEFAULT_INBOUND_DIR;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 3000 });
  try {
    const result = await pool.query("SELECT inbound_path FROM offices WHERE id = $1", [OFFICE_ID]);
    const configured = String(result.rows[0]?.inbound_path || "").trim();
    return configured ? path.resolve(configured) : DEFAULT_INBOUND_DIR;
  } catch (error) {
    console.warn(`[hot-folder] Could not read dynamic inbound path: ${error.message}`);
    return DEFAULT_INBOUND_DIR;
  } finally {
    await pool.end();
  }
}

if (!TOKEN) {
  console.error("[hot-folder] Missing HOT_FOLDER_INGEST_TOKEN");
  process.exit(1);
}

// ── File filter ──────────────────────────────────────────────────────────────
// macOS writes .DS_Store, ._filename (AppleDouble resource forks), and other
// hidden temporary files alongside real content. We must skip them.
const SUPPORTED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp", ".heic", ".heif"]);

function shouldIgnore(filePath) {
  const basename = path.basename(filePath);
  // Skip hidden/dot-files (.DS_Store, ._*, .Spotlight-V100, etc.)
  if (basename.startsWith(".")) return true;
  // Skip macOS temp files from scanner apps (e.g. "filename~", "#filename#")
  if (basename.endsWith("~") || basename.startsWith("#")) return true;
  // Only process known document/image types
  const ext = path.extname(basename).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) return true;
  return false;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const inFlight = new Set();
const pending = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait until a file's size stops growing.
 *
 * macOS Image Capture writes files in two ways:
 *   a) Normal write — file grows incrementally.
 *   b) Atomic rename — file appears fully-formed in one event.
 *
 * For case (b), size will be stable on the first check, so we immediately
 * return true. For case (a), we poll until size is stable.
 */
async function waitForStableFile(filePath, maxWaitMs = 30000) {
  const start = Date.now();
  let prevSize = -1;
  let stableCount = 0; // require two consecutive stable readings for safety
  while (Date.now() - start < maxWaitMs) {
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      // File disappeared — was it moved/renamed away? Stop waiting.
      return false;
    }
    if (stat.size > 0 && stat.size === prevSize) {
      stableCount++;
      if (stableCount >= 2) return true;
    } else {
      stableCount = 0;
    }
    prevSize = stat.size;
    await sleep(500);
  }
  return false;
}

async function sendToIngest(absPath, originalName) {
  const bytes = fs.readFileSync(absPath);
  const file = new File([bytes], originalName);
  const form = new FormData();
  form.set("file", file);
  form.set("sourceStation", SOURCE_STATION);
  form.set("officeId", OFFICE_ID);
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
  if (shouldIgnore(filePath)) return;
  const fileName = path.basename(filePath);
  if (inFlight.has(filePath)) return;
  inFlight.add(filePath);
  try {
    const stable = await waitForStableFile(filePath);
    if (!stable) throw new Error("File is not stable after waiting");

    // Verify the file still exists in INBOUND (Image Capture may have moved it)
    if (!fs.existsSync(filePath)) {
      console.warn(`[hot-folder] File disappeared before processing: ${fileName}`);
      return;
    }

    const processingPath = path.join(PROCESSING_DIR, `${Date.now()}-${fileName}`);
    fs.renameSync(filePath, processingPath);
    try {
      const row = await sendToIngest(processingPath, fileName);
      const donePath = path.join(DONE_DIR, path.basename(processingPath));
      fs.renameSync(processingPath, donePath);
      console.log(`[hot-folder] ✓ Uploaded ${fileName} -> ingest #${row.id}`);
    } catch (e) {
      const failedPath = path.join(FAILED_DIR, path.basename(processingPath));
      fs.renameSync(processingPath, failedPath);
      console.error(`[hot-folder] ✗ Failed ${fileName}: ${e.message}`);
    }
  } catch (e) {
    console.error(`[hot-folder] Error ${fileName}: ${e.message}`);
  } finally {
    inFlight.delete(filePath);
  }
}

function scheduleProcess(filePath) {
  if (shouldIgnore(filePath)) return;
  const key = path.resolve(filePath);
  clearTimeout(pending.get(key));
  // 600ms debounce — catches rapid change events from streaming writes
  const timer = setTimeout(() => {
    pending.delete(key);
    processOne(key);
  }, 600);
  pending.set(key, timer);
}

// ── Startup scan ─────────────────────────────────────────────────────────────
// Process any files that were dropped into INBOUND while the watcher was offline
// (e.g. Image Capture scanned before the script was started).
function scanExistingFiles() {
  let entries;
  try {
    entries = fs.readdirSync(INBOUND_DIR);
  } catch {
    return;
  }
  for (const name of entries) {
    const absPath = path.join(INBOUND_DIR, name);
    if (!shouldIgnore(absPath)) {
      console.log(`[hot-folder] Found pre-existing file: ${name}`);
      scheduleProcess(absPath);
    }
  }
}

// ── Chokidar watcher ─────────────────────────────────────────────────────────
let watcher = null;
let watcherGeneration = 0;

function attachWatcher() {
  ensureHotFolderDirs();
  const generation = ++watcherGeneration;
  console.log(`[hot-folder] Watching ${INBOUND_DIR}`);

  watcher = chokidar.watch(INBOUND_DIR, {
    // The explicit startup scan avoids a double-process race.
    ignoreInitial: true,
    // Polling is reliable for scanner apps and Finder atomic renames.
    usePolling: true,
    interval: 500,
    binaryInterval: 500,
    awaitWriteFinish: {
      stabilityThreshold: 3000,
      pollInterval: 200,
    },
    ignored: (filePath) => {
      const basename = path.basename(filePath);
      return basename.startsWith(".") || basename.endsWith("~") || basename.startsWith("#");
    },
  });

  watcher.on("add", scheduleProcess);
  watcher.on("change", scheduleProcess);
  watcher.on("error", (err) => {
    console.error("[hot-folder] watcher error:", err?.message || err);
  });
  watcher.on("ready", () => {
    if (generation !== watcherGeneration) return;
    console.log("[hot-folder] Watcher ready. Scanning for pre-existing files...");
    scanExistingFiles();
  });
}

async function reloadConfiguredWatcher() {
  const nextInboundDir = await readConfiguredInboundDir();
  if (path.resolve(nextInboundDir) === path.resolve(INBOUND_DIR)) return;

  console.log(`[hot-folder] Inbound path changed: ${INBOUND_DIR} -> ${nextInboundDir}`);
  if (watcher) await watcher.close();
  INBOUND_DIR = nextInboundDir;
  const parentDir = path.dirname(INBOUND_DIR);
  PROCESSING_DIR = path.join(parentDir, "PROCESSING");
  DONE_DIR = path.join(parentDir, "DONE");
  FAILED_DIR = path.join(parentDir, "FAILED");
  attachWatcher();
}

async function main() {
  INBOUND_DIR = await readConfiguredInboundDir();
  const parentDir = path.dirname(INBOUND_DIR);
  PROCESSING_DIR = path.join(parentDir, "PROCESSING");
  DONE_DIR = path.join(parentDir, "DONE");
  FAILED_DIR = path.join(parentDir, "FAILED");
  attachWatcher();
  // Office settings can change while the dev server is running.
  setInterval(() => reloadConfiguredWatcher().catch((error) => {
    console.warn(`[hot-folder] Could not reload inbound path: ${error.message}`);
  }), 10000);
}

await main();

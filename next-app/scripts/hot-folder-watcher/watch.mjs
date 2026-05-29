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
console.log(`[hot-folder] Watching ${INBOUND_DIR}`);

const watcher = chokidar.watch(INBOUND_DIR, {
  // ignoreInitial: true so our own scanExistingFiles() handles startup,
  // avoiding a double-process race.
  ignoreInitial: true,
  // usePolling ensures reliable detection when apps write via atomic rename
  // (common with macOS Image Capture, Preview, Finder copy-paste).
  usePolling: true,
  interval: 500,
  binaryInterval: 500,
  awaitWriteFinish: {
    // 3s stability window — accommodates slow scanner I/O
    stabilityThreshold: 3000,
    pollInterval: 200,
  },
  // Ignore macOS junk files at the chokidar level too
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

// Run startup scan after watcher is initialised
watcher.on("ready", () => {
  console.log("[hot-folder] Watcher ready. Scanning for pre-existing files...");
  scanExistingFiles();
});

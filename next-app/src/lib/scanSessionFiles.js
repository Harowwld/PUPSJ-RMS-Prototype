import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function getLocalDir() {
  return process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");
}

export function getScanUploadsDir() {
  const dir = path.join(getLocalDir(), "scan-uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function makeScanStorageFilename(ext = ".pdf") {
  const safeExt = String(ext || ".pdf").toLowerCase().startsWith(".")
    ? String(ext || ".pdf").toLowerCase()
    : `.${String(ext || "pdf").toLowerCase()}`;
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`;
}

export function getScanFilePath(storageFilename) {
  return path.join(getScanUploadsDir(), storageFilename);
}


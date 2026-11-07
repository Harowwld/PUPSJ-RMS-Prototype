import path from "node:path";

export function officePathId(officeId) {
  const id = String(officeId || "").trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("Invalid office ID for local storage");
  return id;
}

export function getLocalDataDir() {
  return path.resolve(process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local"));
}

export function getHotFolderRoot() {
  return path.resolve(process.env.HOT_FOLDER_ROOT || path.join(getLocalDataDir(), "hot-folder"));
}

export function getOfficeUploadsDir(officeId) {
  return path.join(getLocalDataDir(), "storage", officePathId(officeId), "uploads");
}

export function getOfficeHotFolderDirs(officeId) {
  const root = path.join(getHotFolderRoot(), officePathId(officeId));
  return {
    inbound: path.join(root, "INBOUND"),
    processing: path.join(root, "PROCESSING"),
    done: path.join(root, "DONE"),
    failed: path.join(root, "FAILED"),
  };
}

export function getScannerVisibleInboundDir(officeId) {
  return path.posix.join(getScannerHostRoot(), officePathId(officeId), "INBOUND");
}

export function getScannerHostRoot() {
  const hostPath = String(process.env.HOT_FOLDER_HOST_PATH || "").trim();
  return hostPath ? hostPath.replace(/\\/g, "/") : getHotFolderRoot();
}

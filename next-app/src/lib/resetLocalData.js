import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getLocalDataDir } from "./officePaths.js";

async function clearEntries(directory) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (!entry.isDirectory()) {
      await fs.unlink(entryPath).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
      continue;
    }
    try {
      await fs.rm(entryPath, { recursive: true, force: true });
    } catch (error) {
      if (error.code !== "EBUSY") throw error;
      await clearEntries(entryPath);
    }
  }
}

export async function validateLocalDataResetTarget() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Local data reset is unavailable in production.");
  }

  const root = getLocalDataDir();
  const appDir = path.resolve(process.cwd());
  const relativeAppPath = path.relative(root, appDir);
  if (
    root === path.parse(root).root ||
    root === os.homedir() ||
    root === path.join(os.homedir(), ".local") ||
    root === os.tmpdir() ||
    root === appDir ||
    (relativeAppPath && !relativeAppPath.startsWith("..") && !path.isAbsolute(relativeAppPath))
  ) {
    throw new Error(`Refusing to clear an unsafe local data directory: ${root}`);
  }

  let rootStat;
  try {
    rootStat = await fs.lstat(root);
  } catch (error) {
    if (error.code === "ENOENT") return root;
    throw error;
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error(`Refusing to clear a non-directory or linked local data path: ${root}`);
  }
  return root;
}

export async function clearLocalDataForReset() {
  const root = await validateLocalDataResetTarget();
  await clearEntries(root);
}

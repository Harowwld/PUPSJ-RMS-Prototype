import { link, lstat, mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import { getOfficeHotFolderDirs } from "../../src/lib/officePaths.js";

const [officeId, action = "list", filename] = process.argv.slice(2);
if (!officeId || !["list", "retry", "discard"].includes(action) || (action !== "list" && !filename)) {
  console.error("Usage: pnpm scans:failed <office> [list | retry <filename> | discard <filename>]");
  process.exit(1);
}

const dirs = getOfficeHotFolderDirs(officeId);
if (action === "list") {
  const entries = await readdir(dirs.failed, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const stat = await lstat(path.join(dirs.failed, entry.name)).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (stat?.isFile()) files.push({
      filename: entry.name,
      bytes: stat.size,
      modified: stat.mtime.toISOString(),
    });
  }
  files.sort((a, b) => a.modified.localeCompare(b.modified));
  console.table(files);
  console.log(`${files.length} failed scan(s), ${files.reduce((bytes, file) => bytes + file.bytes, 0)} bytes`);
} else {
  if (path.basename(filename) !== filename || filename === "." || filename === "..") {
    throw new Error("Use a filename from the failed scan list.");
  }

  const source = path.join(dirs.failed, filename);
  if (!(await lstat(source)).isFile()) throw new Error("The failed scan must be a regular file.");

  if (action === "retry") {
    await mkdir(dirs.inbound, { recursive: true });
    const originalName = filename.replace(/^\d{13}-/, "");
    if (!originalName || originalName.startsWith(".") || originalName.startsWith("#") || originalName.endsWith("~")) {
      throw new Error("This scan does not have a valid inbound filename.");
    }
    const target = path.join(dirs.inbound, originalName);
    // Exclusive creation preserves the scanner filename and leaves existing inbound files intact.
    await link(source, target);
    await unlink(source);
    console.log(`Queued for retry: ${path.basename(target)}`);
  } else {
    await unlink(source);
    console.log(`Discarded failed scan: ${filename}`);
  }
}

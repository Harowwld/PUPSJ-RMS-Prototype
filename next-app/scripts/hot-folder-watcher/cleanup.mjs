import fs from "node:fs";
import path from "node:path";

export function cleanupDoneFiles(doneDir) {
  let removed = 0;
  try {
    if (!fs.lstatSync(doneDir).isDirectory()) return removed;
    const entries = fs.readdirSync(doneDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const filePath = path.join(doneDir, entry.name);
      try {
        fs.unlinkSync(filePath);
        removed += 1;
      } catch (error) {
        console.warn(`[hot-folder] Could not clean DONE file ${filePath}: ${error.message}`);
      }
    }
  } catch (error) {
    console.warn(`[hot-folder] Could not clean DONE folder ${doneDir}: ${error.message}`);
  }
  if (removed > 0) {
    console.log(`[hot-folder] Removed ${removed} accepted scanner file(s) from ${doneDir}`);
  }
  return removed;
}

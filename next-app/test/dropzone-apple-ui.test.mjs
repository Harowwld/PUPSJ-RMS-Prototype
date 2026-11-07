import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..");

test("FileAttachmentDropzone conforms to Apple AirDrop / Finder drag-and-drop standards", () => {
  const dropzonePath = path.join(
    ROOT_DIR,
    "src/components/shared/FileAttachmentDropzone.jsx"
  );
  assert.ok(fs.existsSync(dropzonePath), "FileAttachmentDropzone.jsx must exist");

  const code = fs.readFileSync(dropzonePath, "utf8");

  // 1. Dropzone Geometry & Subtle Dashed Border
  assert.ok(
    code.includes("rounded-[20px] border border-dashed"),
    "Dropzone must feature rounded-[20px] and hairline border-dashed"
  );
  assert.ok(
    code.includes("border-black/15 hover:border-black/25") &&
    code.includes("dark:border-white/15 dark:hover:border-white/25"),
    "Dropzone must use subtle border-black/15 in light mode and dark:border-white/15"
  );
  assert.ok(
    code.includes("scale-[1.01]"),
    "Dropzone dragging state must feature Apple spring scale halo scale-[1.01]"
  );

  // 2. AttachedFileCard Apple Circular Action Discs
  assert.ok(
    code.includes("size-7.5 rounded-full") &&
    code.includes("active:scale-95"),
    "AttachedFileCard hover action buttons must be Apple circular discs"
  );
  assert.ok(
    code.includes("border border-black/[0.08] dark:border-white/10"),
    "AttachedFileCard must feature hairline border border-black/[0.08] dark:border-white/10"
  );

  // 3. UploadProgressCard
  assert.ok(
    code.includes("h-1.5 w-full rounded-full bg-black/[0.06] dark:bg-white/10"),
    "UploadProgressCard progress track must use subtle rounded track"
  );
});

test("ScanUploadTab adopts Apple dimmed backdrop blur overlay for drop zone", () => {
  const scanUploadPath = path.join(
    ROOT_DIR,
    "src/components/staff/ScanUploadTab.js"
  );
  assert.ok(fs.existsSync(scanUploadPath), "ScanUploadTab.js must exist");

  const code = fs.readFileSync(scanUploadPath, "utf8");
  assert.ok(
    code.includes("bg-black/35 backdrop-blur-sm"),
    "ScanUploadTab drag overlay must use Apple dimmed scrim bg-black/35 backdrop-blur-sm"
  );
});

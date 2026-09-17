import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { waitForStableFile } from "../scripts/hot-folder-watcher/fileStability.mjs";

test("stable files become eligible without a fixed three-second wait", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pupsj-stability-"));
  const filePath = path.join(directory, "scan.pdf");
  fs.writeFileSync(filePath, "complete");

  const startedAt = Date.now();
  const stable = await waitForStableFile(filePath, { maxWaitMs: 500, pollIntervalMs: 20 });

  assert.equal(stable, true);
  assert.ok(Date.now() - startedAt < 500);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("missing files are never reported as stable", async () => {
  const stable = await waitForStableFile("/tmp/pupsj-file-that-does-not-exist.pdf", { maxWaitMs: 100, pollIntervalMs: 10 });
  assert.equal(stable, false);
});

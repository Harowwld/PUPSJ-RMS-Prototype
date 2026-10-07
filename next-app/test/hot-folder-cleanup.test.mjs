import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cleanupDoneFiles } from "../scripts/hot-folder-watcher/cleanup.mjs";

function createHotFolder(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pupsj-cleanup-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const name of ["INBOUND", "PROCESSING", "DONE", "FAILED"]) {
    fs.mkdirSync(path.join(root, name));
  }
  t.mock.method(console, "log", () => {});
  return root;
}

test("cleanup removes only regular DONE files and preserves unfinished scans", (t) => {
  const root = createHotFolder(t);
  const done = path.join(root, "DONE");
  for (const folder of ["INBOUND", "PROCESSING", "DONE", "FAILED"]) {
    fs.writeFileSync(path.join(root, folder, "scan.pdf"), "scan bytes");
  }
  fs.writeFileSync(path.join(done, ".old-scan.pdf"), "accepted scan bytes");
  fs.mkdirSync(path.join(done, "nested"));
  fs.writeFileSync(path.join(done, "nested", "scan.pdf"), "nested bytes");
  const inboundScan = path.join(root, "INBOUND", "scan.pdf");
  fs.symlinkSync(inboundScan, path.join(done, "linked-scan.pdf"));

  assert.equal(cleanupDoneFiles(done), 2);
  assert.equal(fs.existsSync(path.join(done, "scan.pdf")), false);
  assert.equal(fs.existsSync(path.join(done, ".old-scan.pdf")), false);
  assert.equal(fs.readFileSync(path.join(done, "nested", "scan.pdf"), "utf8"), "nested bytes");
  assert.equal(fs.lstatSync(path.join(done, "linked-scan.pdf")).isSymbolicLink(), true);
  for (const folder of ["INBOUND", "PROCESSING", "FAILED"]) {
    assert.equal(fs.readFileSync(path.join(root, folder, "scan.pdf"), "utf8"), "scan bytes");
  }
  assert.equal(cleanupDoneFiles(done), 0);
});

test("deletion errors are logged without throwing and retained files can be retried", (t) => {
  const root = createHotFolder(t);
  const done = path.join(root, "DONE");
  const retained = path.join(done, "locked.pdf");
  fs.writeFileSync(retained, "accepted scan bytes");
  fs.writeFileSync(path.join(done, "removable.pdf"), "accepted scan bytes");
  const warnings = [];
  t.mock.method(console, "warn", (message) => warnings.push(message));
  const unlink = fs.unlinkSync;
  const blockedUnlink = t.mock.method(fs, "unlinkSync", (filePath) => {
    if (filePath === retained) throw new Error("permission denied");
    return unlink(filePath);
  });

  assert.equal(cleanupDoneFiles(done), 1);
  assert.equal(fs.readFileSync(retained, "utf8"), "accepted scan bytes");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Could not clean DONE file .*locked\.pdf: permission denied/);
  assert.deepEqual(fs.readdirSync(path.join(root, "FAILED")), []);
  blockedUnlink.mock.restore();
  assert.equal(cleanupDoneFiles(done), 1);
});

test("folder access errors are logged without interrupting the watcher", (t) => {
  const root = createHotFolder(t);
  const warnings = [];
  t.mock.method(console, "warn", (message) => warnings.push(message));
  assert.equal(cleanupDoneFiles(path.join(root, "missing-DONE")), 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Could not clean DONE folder/);
});

test("a symlinked DONE folder is not followed", (t) => {
  const root = createHotFolder(t);
  const inbound = path.join(root, "INBOUND");
  fs.writeFileSync(path.join(inbound, "scan.pdf"), "unfinished scan");
  const linkedDone = path.join(root, "linked-DONE");
  fs.symlinkSync(inbound, linkedDone, "dir");
  assert.equal(cleanupDoneFiles(linkedDone), 0);
  assert.equal(fs.readFileSync(path.join(inbound, "scan.pdf"), "utf8"), "unfinished scan");
});

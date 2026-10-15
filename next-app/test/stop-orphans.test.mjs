import assert from "node:assert/strict";
import test from "node:test";
import { collectProcessTree, findOrphanedRmsLaunchers, parseProcessTable } from "../scripts/orphanProcesses.mjs";

test("process parsing keeps command arguments and parent identity", () => {
  assert.deepEqual(parseProcessTable("  10  1  501 node scripts/run-next-with-ocr.mjs dev\n"), [
    { pid: 10, ppid: 1, uid: 501, command: "node scripts/run-next-with-ocr.mjs dev" },
  ]);
});

test("orphan detection only matches this workspace's RMS launcher roots", () => {
  const processes = [
    { pid: 10, ppid: 1, uid: 501, cwd: "/rms", command: "node scripts/run-next-with-ocr.mjs dev" },
    { pid: 11, ppid: 99, uid: 501, cwd: "/rms", command: "node scripts/run-next-with-ocr.mjs dev" },
    { pid: 12, ppid: 1, uid: 501, cwd: "/other", command: "node scripts/run-next-with-ocr.mjs dev" },
    { pid: 13, ppid: 1, uid: 502, cwd: "/rms", command: "node scripts/run-next-with-ocr.mjs dev" },
    { pid: 14, ppid: 1, uid: 501, cwd: "/rms", command: "node unrelated-server.mjs" },
  ];
  assert.deepEqual(findOrphanedRmsLaunchers(processes, { uid: 501, workspacePath: "/rms" }), [processes[0]]);
});

test("process tree includes descendants deepest-first and excludes unrelated processes", () => {
  const processes = [
    { pid: 1, ppid: 0 },
    { pid: 2, ppid: 1 },
    { pid: 3, ppid: 2 },
    { pid: 4, ppid: 1 },
    { pid: 5, ppid: 9 },
  ];
  assert.deepEqual(collectProcessTree(processes, 1).map(({ pid }) => pid), [3, 2, 4, 1]);
});

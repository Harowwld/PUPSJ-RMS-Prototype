import test, { mock } from "node:test";
import assert from "node:assert/strict";

let rows;
let savedSchedules;
let created;
let copied;
let externalError;
let localError;
let pauseBackup;

mock.module("../src/lib/postgresCompat.js", {
  namedExports: {
    dbAll: async () => rows,
    dbRun: async (_sql, [value, key]) => savedSchedules.push({ key, schedule: JSON.parse(value) }),
  },
});
mock.module("../src/lib/backupsRepo.js", {
  namedExports: {
    executeSystemBackup: async (options) => {
      created.push({ scope: "system", ...options });
      if (localError) throw localError;
      if (pauseBackup) await pauseBackup;
      return { id: 71, filename: "system.zip.enc" };
    },
    executeOfficeBackup: async (options) => {
      created.push({ scope: "office", ...options });
      return { id: 72, filename: "registrar.zip.enc" };
    },
    syncBackupExternally: async (id) => {
      copied.push(id);
      if (externalError) throw externalError;
      return { ok: true };
    },
  },
});
mock.module("../src/lib/auditLogsRepo.js", {
  namedExports: { createAuditLog: async () => {} },
});

const { checkAndRunScheduledBackups } = await import("../src/lib/backupScheduler.js");

function prepare(keys) {
  const now = new Date();
  rows = keys.map((key) => ({
    key,
    value: JSON.stringify({
      enabled: true,
      frequency: "daily",
      time: `${now.getHours()}:${now.getMinutes()}`,
      createdBy: "admin-test",
      lastRunError: "Old local failure",
      lastRunFilename: "old.zip.enc",
      lastRunExternalStatus: "success",
      lastRunExternalError: "Old drive failure",
    }),
  }));
  savedSchedules = [];
  created = [];
  copied = [];
  externalError = null;
  localError = null;
  pauseBackup = null;
}

test("scheduled system and office backups automatically copy their new archives externally", async () => {
  prepare(["auto_backup_schedule", "auto_backup_schedule_registrar"]);

  await checkAndRunScheduledBackups();

  assert.deepEqual(created, [
    { scope: "system", actorId: "admin-test" },
    { scope: "office", officeId: "registrar", actorId: "admin-test" },
  ]);
  assert.deepEqual(copied, [71, 72]);
  assert.equal(savedSchedules.length, 2);
  for (const { schedule } of savedSchedules) {
    assert.equal(schedule.lastRunStatus, "success");
    assert.equal(schedule.lastRunExternalStatus, "success");
    assert.equal(schedule.lastRunError, undefined);
    assert.equal(schedule.lastRunExternalError, undefined);
    assert.ok(schedule.lastRunAt);
    assert.ok(schedule.lastRunFilename);
  }
});

test("an unavailable external drive preserves the successful local archive status", async () => {
  prepare(["auto_backup_schedule_registrar"]);
  externalError = new Error("External backup drive is not connected.");

  await checkAndRunScheduledBackups();

  assert.deepEqual(copied, [72]);
  assert.equal(savedSchedules.length, 1);
  const { schedule } = savedSchedules[0];
  assert.equal(schedule.lastRunStatus, "success");
  assert.equal(schedule.lastRunFilename, "registrar.zip.enc");
  assert.equal(schedule.lastRunError, undefined);
  assert.equal(schedule.lastRunExternalStatus, "failed");
  assert.equal(schedule.lastRunExternalError, externalError.message);
});

test("overlapping scheduler ticks do not create duplicate archives", async () => {
  prepare(["auto_backup_schedule"]);
  let resume;
  pauseBackup = new Promise((resolve) => { resume = resolve; });
  const firstTick = checkAndRunScheduledBackups();
  await Promise.resolve();

  await checkAndRunScheduledBackups();
  assert.equal(created.length, 1);
  resume();
  await firstTick;
  assert.equal(savedSchedules.length, 1);
  assert.deepEqual(copied, [71]);
  assert.equal(globalThis.__backupSchedulerRunning, false);
});

test("a failed local backup clears stale external copy results and releases the scheduler", async () => {
  prepare(["auto_backup_schedule"]);
  localError = new Error("Local archive creation failed.");

  await checkAndRunScheduledBackups();

  assert.deepEqual(copied, []);
  const { schedule } = savedSchedules[0];
  assert.equal(schedule.lastRunStatus, "failed");
  assert.equal(schedule.lastRunError, localError.message);
  assert.equal(schedule.lastRunFilename, undefined);
  assert.equal(schedule.lastRunExternalStatus, undefined);
  assert.equal(schedule.lastRunExternalError, undefined);
  assert.equal(globalThis.__backupSchedulerRunning, false);
});

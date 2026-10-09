import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  detectExternalDrive,
  detectLinuxDrives,
  detectMacDrives,
  detectWindowsDrives,
  getLinuxMounts,
  isLinuxBlockDeviceUsb,
  formatBytes,
  getDiskSpace,
  isDirectoryWritable,
  setSimulationMode,
  isSimulationMode,
} from "../src/lib/externalDriveDetector.js";

test("externalDriveDetector unit & cross-platform suite", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pupsj-drive-test-"));
  const originalEnv = { ...process.env };

  try {
    process.env.LOCAL_DATA_DIR = path.join(root, "local");
    process.env.EXTERNAL_BACKUP_SIMULATE = "false";
    process.env.EXTERNAL_BACKUP_PATH = "";

    await t.test("formatBytes helper formatting", () => {
      assert.equal(formatBytes(0), "0 B");
      assert.equal(formatBytes(null), "0 B");
      assert.equal(formatBytes(1024), "1 KB");
      assert.equal(formatBytes(1024 * 1024 * 500), "500 MB");
      assert.equal(formatBytes(1024 * 1024 * 1024 * 2.5), "2.5 GB");
    });

    await t.test("diskSpace and directoryWritable helpers", () => {
      const testDir = path.join(root, "space-check");
      fs.mkdirSync(testDir);
      assert.equal(isDirectoryWritable(testDir), true);
      const space = getDiskSpace(testDir);
      assert.ok(space);
      assert.ok(typeof space.freeBytes === "number");
      assert.ok(typeof space.totalBytes === "number");
      assert.ok(typeof space.freeFormatted === "string");
    });

    await t.test("simulation mode toggle and persistence", () => {
      setSimulationMode(true);
      assert.equal(isSimulationMode(), true);
      const simulated = detectExternalDrive();
      assert.equal(simulated.connected, true);
      assert.equal(simulated.isEmulated, true);
      assert.ok(simulated.path.includes("external_media"));

      setSimulationMode(false);
      assert.equal(isSimulationMode(), false);
      const hardware = detectExternalDrive();
      assert.equal(hardware.isEmulated, false);
    });

    await t.test("configured EXTERNAL_BACKUP_PATH resolution", () => {
      const customDrive = path.join(root, "custom-drive");
      fs.mkdirSync(customDrive);
      process.env.EXTERNAL_BACKUP_PATH = customDrive;

      const detected = detectExternalDrive({ simulate: false });
      assert.equal(detected.connected, true);
      assert.equal(detected.configured, true);
      assert.equal(detected.path, customDrive);
      assert.equal(detected.isEmulated, false);
      assert.equal(detected.isWritable, true);

      // Missing path
      process.env.EXTERNAL_BACKUP_PATH = path.join(root, "non-existent-drive");
      const missing = detectExternalDrive({ simulate: false });
      assert.equal(missing.connected, false);
      assert.equal(missing.configured, true);
      assert.ok(missing.message.includes("unavailable or not mounted"));
      process.env.EXTERNAL_BACKUP_PATH = "";
    });

    await t.test("Windows path on POSIX is safely ignored and falls back to physical detection", { skip: os.platform() === "win32" }, () => {
      process.env.EXTERNAL_BACKUP_PATH = "E:/backups";
      const detected = detectExternalDrive({ simulate: false });
      // On non-Windows OS, E:/backups should be skipped from blocking hardware detection
      assert.equal(detected.isEmulated, false);
      assert.equal(detected.path, null);
      process.env.EXTERNAL_BACKUP_PATH = "";
    });

    await t.test("Linux detection helpers do not crash on current platform", () => {
      const mounts = getLinuxMounts();
      assert.ok(Array.isArray(mounts));
      assert.equal(isLinuxBlockDeviceUsb(""), false);
      assert.equal(isLinuxBlockDeviceUsb(null), false);

      const drives = detectLinuxDrives();
      assert.ok(Array.isArray(drives));
    });

    await t.test("macOS and Windows detector functions return arrays without throwing", () => {
      const macDrives = detectMacDrives();
      assert.ok(Array.isArray(macDrives));

      const winDrives = detectWindowsDrives();
      assert.ok(Array.isArray(winDrives));
    });
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
    delete global.__PUPSJ_SIMULATION_ENABLED;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

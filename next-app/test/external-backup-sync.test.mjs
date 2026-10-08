import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { detectExternalDrive } from "../src/lib/externalDriveDetector.js";

let record;
let externalStatus;
global.__pupsjPostgresPool = {
  async query(sql, params) {
    if (sql.startsWith("SELECT * FROM backups")) return { rows: [record] };
    if (sql.startsWith("UPDATE backups SET status_external")) {
      externalStatus = params[0];
      return { rows: [{ id: record.id }] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  },
};
const { getExternalBackupsDir, syncBackupExternally } = await import("../src/lib/backupsRepo.js");

test("external copy only uses the available configured drive and verifies copied bytes", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pupsj-external-test-"));
  const originalEnv = { ...process.env };
  try {
    process.env.LOCAL_DATA_DIR = path.join(root, "local");
    process.env.EXTERNAL_BACKUP_SIMULATE = "false";
    process.env.EXTERNAL_BACKUP_REQUIRE_MOUNT = "false";
    process.env.EXTERNAL_BACKUP_PATH = path.join(root, "unplugged", "drive");

    await t.test("missing configured target is disconnected and never created", () => {
      assert.equal(detectExternalDrive({ simulate: false }).connected, false);
      assert.throws(() => getExternalBackupsDir(), /No writable external drive/);
      assert.equal(fs.existsSync(process.env.EXTERNAL_BACKUP_PATH), false);
    });

    const drive = path.join(root, "drive");
    fs.mkdirSync(drive);
    process.env.EXTERNAL_BACKUP_PATH = drive;
    await t.test("mount-required mode rejects an ordinary directory", { skip: os.platform() === "win32" }, () => {
      process.env.EXTERNAL_BACKUP_REQUIRE_MOUNT = "true";
      assert.equal(detectExternalDrive({ simulate: false }).connected, false);
      assert.throws(() => getExternalBackupsDir(), /No writable external drive/);
      assert.equal(fs.existsSync(path.join(drive, "PUPSJ_BACKUPS")), false);
      process.env.EXTERNAL_BACKUP_REQUIRE_MOUNT = "false";
    });

    const sourceDir = path.join(process.env.LOCAL_DATA_DIR, "backups");
    fs.mkdirSync(sourceDir, { recursive: true });
    const bytes = Buffer.from("encrypted backup fixture");
    const source = path.join(sourceDir, "fixture.zip.enc");
    fs.writeFileSync(source, bytes);
    record = { id: 1, filename: path.basename(source), checksum: crypto.createHash("sha256").update(bytes).digest("hex") };
    const target = path.join(drive, "PUPSJ_BACKUPS", new Date().toISOString().split("T")[0], record.filename);

    await t.test("matching checksum marks the external copy successful", async () => {
      await syncBackupExternally(record.id);
      assert.equal(externalStatus, "Success");
      assert.deepEqual(fs.readFileSync(target), bytes);
    });

    await t.test("checksum mismatch marks failure, removes partial copy and retains source and prior verified copy", async () => {
      fs.writeFileSync(source, "corrupted local bytes");
      await assert.rejects(syncBackupExternally(record.id), /checksum verification failed/);
      assert.equal(externalStatus, "Failed");
      assert.equal(fs.readFileSync(source, "utf8"), "corrupted local bytes");
      assert.deepEqual(fs.readFileSync(target), bytes);
      assert.deepEqual(fs.readdirSync(path.dirname(target)), [record.filename]);
    });

    await t.test("unplugged destination records failure while retaining local archive", async () => {
      process.env.EXTERNAL_BACKUP_PATH = path.join(root, "unplugged");
      await assert.rejects(syncBackupExternally(record.id), /No writable external drive/);
      assert.equal(externalStatus, "Failed");
      assert.equal(fs.existsSync(source), true);
      assert.equal(fs.existsSync(process.env.EXTERNAL_BACKUP_PATH), false);
    });
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    delete global.__pupsjPostgresPool;
    delete global.__PUPSJ_SIMULATION_ENABLED;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

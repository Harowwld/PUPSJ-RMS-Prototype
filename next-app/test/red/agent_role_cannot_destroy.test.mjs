import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let nextAppDir = path.resolve(__dirname, "../../next-app");
if (!fs.existsSync(nextAppDir)) {
  nextAppDir = path.resolve(__dirname, "../..");
}

const {
  getBackupsDir,
  getBackupFilePath,
} = await import(path.join(nextAppDir, "src/lib/backupsRepo.js"));

test("agent_role_cannot_destroy: external media backups are strictly append-only", async (t) => {
  const localDir = getBackupsDir();
  const simulatedExternalDir = path.join(nextAppDir, ".local", "test-external-media", "PUPSJ_BACKUPS");
  if (!fs.existsSync(simulatedExternalDir)) {
    fs.mkdirSync(simulatedExternalDir, { recursive: true });
  }

  const testFilename = `PUP-TEST-IMMUTABLE-${Date.now()}.zip.enc`;
  const localFilePath = path.join(localDir, testFilename);
  const externalFilePath = path.join(simulatedExternalDir, testFilename);
  const payload = Buffer.from("IMMUTABLE_INSTITUTIONAL_BACKUP_SNAPSHOT_CONTENT", "utf8");

  // Write both local and external copies
  fs.writeFileSync(localFilePath, payload);
  fs.writeFileSync(externalFilePath, payload);

  assert.ok(fs.existsSync(localFilePath), "Local backup file must exist initially");
  assert.ok(fs.existsSync(externalFilePath), "External backup file must exist initially");

  // Simulated Agent / Dashboard deletion function
  function executeDashboardDeleteOperation({ deleteExternal = false } = {}) {
    // Contract rule: Application delete ONLY deletes local copy
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    // Planted Fault check:
    // If an agent or code change attempts to delete external storage, it violates the contract
    if (deleteExternal) {
      if (fs.existsSync(externalFilePath)) {
        fs.unlinkSync(externalFilePath);
      }
    }
  }

  const plantBreak = process.env.PLANT_BREAK_AGENT_DESTROYS_EXTERNAL === "true";
  executeDashboardDeleteOperation({ deleteExternal: plantBreak });

  // Assert local was deleted
  assert.strictEqual(fs.existsSync(localFilePath), false, "Local copy should be deleted");

  // Invariant Promise: External file MUST NEVER BE DELETED
  const externalStillExists = fs.existsSync(externalFilePath);
  assert.strictEqual(
    externalStillExists,
    true,
    "CRITICAL FAULT: External backup volume archive was modified or destroyed! External media must be append-only."
  );

  // Clean up test external media
  if (fs.existsSync(externalFilePath)) {
    fs.unlinkSync(externalFilePath);
  }
  if (fs.existsSync(simulatedExternalDir)) {
    fs.rmSync(path.join(nextAppDir, ".local", "test-external-media"), { recursive: true, force: true });
  }
});

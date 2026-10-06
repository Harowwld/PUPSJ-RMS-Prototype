import test from "node:test";
import assert from "node:assert/strict";
import { createBackupFilename } from "../src/lib/backupsRepo.js";

test("system and office backups receive distinct filenames within the same second", () => {
  const timestamp = new Date("2026-10-05T03:04:05.000Z");
  const systemA = createBackupFilename({ scope: "system", timestamp });
  const systemB = createBackupFilename({ scope: "system", timestamp });
  const office = createBackupFilename({ scope: "office", officeId: "registrar", timestamp });

  assert.notEqual(systemA, systemB);
  assert.match(systemA, /^PUP-SYSTEM-GOVERNANCE-BACKUP-2026-10-05-\d{6}-[a-f0-9]{16}\.zip\.enc$/);
  assert.match(office, /^PUP-REGISTRAR-BACKUP-2026-10-05-\d{6}-[a-f0-9]{16}\.zip\.enc$/);
});

test("office backup filenames require an office scope", () => {
  assert.throws(() => createBackupFilename({ scope: "office" }), /Office scope is required/);
});

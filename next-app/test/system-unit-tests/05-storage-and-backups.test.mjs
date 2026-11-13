import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const {
  formatLocationCode,
  buildRegistrarArchivalPath,
  computeBufferSha256,
  generateManifestJson,
} = await import("../../src/lib/archivalStructure.js");
const { encryptFile, decryptFile } = await import("../../src/lib/encryption.js");
const { classifyBackupsGFS } = await import("../../src/lib/backupRetention.js");

test("Module 5.1: Storage Layout - Locations are formatted and mapped properly", () => {
  const code = formatLocationCode(1, "A", 2);
  assert.equal(code, "R1-CabA-D2", "Location code format should be R{room}-Cab{cabinet}-D{drawer}");

  const archivalPath = buildRegistrarArchivalPath({
    courseCode: "BSIT",
    academicYear: 2024,
    section: "1",
    studentNo: "2024-00123-SJ-0",
    studentName: "Dela Cruz, Juan",
    room: 1,
    cabinet: "A",
    drawer: 2,
    docType: "Form 137",
    originalFilename: "f137.pdf",
  });

  assert.ok(archivalPath.includes("BSIT"), "Archival path should contain course code");
  assert.ok(archivalPath.includes("2024-00123-SJ-0"), "Archival path should contain student number");
  assert.ok(archivalPath.includes("R1-CabA-D2"), "Archival path should reflect storage location");
});

test("Module 5.2: Backup Manifest & Checksum - Generates valid metadata and SHA-256", () => {
  const dummyPayload = Buffer.from("PUPSJ RMS Archive Payload Test");
  const checksum = computeBufferSha256(dummyPayload);
  assert.equal(typeof checksum, "string");
  assert.equal(checksum.length, 64, "SHA-256 checksum must be 64 hex characters");

  const manifest = generateManifestJson({
    scope: "office",
    officeId: "registrar",
    backupType: "Manual",
    records: [{ id: 1, studentNo: "2024-00123-SJ-0" }],
  });

  const parsed = JSON.parse(manifest);
  assert.equal(parsed.officeId, "registrar");
  assert.equal(parsed.backupType, "Manual");
  assert.equal(parsed.totalRecords, 1);
});

test("Module 5.3: Backup Encryption - Encrypts and decrypts backup archives with AES-256-CBC", async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pupsj-backup-test-"));
  const plainFile = path.join(tmpDir, "plain.txt");
  const encFile = path.join(tmpDir, "plain.txt.enc");
  const restoredFile = path.join(tmpDir, "restored.txt");

  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const originalContent = "Confidential Student Academic Records 2026";
  await fs.writeFile(plainFile, originalContent, "utf8");

  await encryptFile(plainFile, encFile);
  const encryptedBytes = await fs.readFile(encFile);
  assert.notEqual(encryptedBytes.toString("utf8"), originalContent, "Encrypted file must not be plaintext");

  await decryptFile(encFile, restoredFile);
  const decryptedContent = await fs.readFile(restoredFile, "utf8");
  assert.equal(decryptedContent, originalContent, "Decrypted file must match original content");
});

test("Module 5.4: Backup Retention - Grandfather-Father-Son (GFS) classification protects critical backups", () => {
  const now = Date.now();
  const mockBackups = [
    {
      id: 1,
      filename: "PUP-REGISTRAR-MANUAL-2024.zip.enc",
      backup_type: "Manual",
      created_at: new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      filename: "PUP-REGISTRAR-SAFETY-2024.zip.enc",
      backup_type: "Pre-Restore Safety",
      created_at: new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      filename: "PUP-REGISTRAR-AUTO-EXPIRED.zip.enc",
      backup_type: "Automated",
      created_at: new Date(now - 400 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const classified = classifyBackupsGFS(mockBackups);
  assert.equal(classified.length, 3);

  const manual = classified.find((c) => c.backup.id === 1);
  assert.equal(manual.retain, true, "Manual backups must always be retained");

  const safety = classified.find((c) => c.backup.id === 2);
  assert.equal(safety.retain, true, "Safety backups must always be retained");
});

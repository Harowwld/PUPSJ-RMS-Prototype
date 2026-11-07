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

// Dynamic import from next-app lib
const {
  encryptBackupBuffer,
  decryptBackupBuffer,
} = await import(path.join(nextAppDir, "src/lib/backupsRepo.js"));

test("restore_meets_rpo: AES-256-GCM backup integrity catches ciphertext tampering", async (t) => {
  const originalPayload = Buffer.from(
    JSON.stringify({
      schema_version: 92,
      tables: ["students", "documents", "courses"],
      test_record_count: 86,
      checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    }),
    "utf8"
  );

  // 1. Legitimate backup encryption
  const encryptedArchive = encryptBackupBuffer(originalPayload);
  assert.ok(Buffer.isBuffer(encryptedArchive), "Encrypted archive should be a Buffer");
  assert.ok(encryptedArchive.length > originalPayload.length, "Encrypted archive should include header, IV, and tag");

  // 2. Legitimate decryption should restore exact payload
  const decrypted = decryptBackupBuffer(encryptedArchive);
  assert.deepEqual(decrypted, originalPayload, "Decrypted buffer should match original payload exactly");

  // 3. Planted Fault Simulation:
  // Plant a fault by flipping a byte in the encrypted ciphertext or authentication tag.
  // The law: If ciphertext or GCM tag is tampered, the system MUST refuse restore and throw.
  const tamperedArchive = Buffer.from(encryptedArchive);
  const tamperOffset = tamperedArchive.length - 10; // Tamper in ciphertext body
  tamperedArchive[tamperOffset] = tamperedArchive[tamperOffset] ^ 0xff; // Flip bits

  // 4. Verification: System MUST throw on tampered archive
  assert.throws(
    () => {
      decryptBackupBuffer(tamperedArchive);
    },
    /Failed to decrypt backup\. Invalid key or corrupted file\./,
    "Tampered archive must be rejected by GCM authentication tag verification"
  );
});

test("restore_meets_rpo: planted break verification (demonstrating red on bypass)", async () => {
  // Fault test: if a break bypassed authentication and returned corrupted buffer without error
  function brokenDecryptionBypass(tamperedBuf) {
    if (process.env.PLANT_BREAK_RESTORE_BYPASS === "true") {
      // Planted fault: silently returns corrupted data without verifying GCM tag
      return Buffer.from("CORRUPTED_DATA_BYPASSED");
    }
    return decryptBackupBuffer(tamperedBuf);
  }

  const dummy = encryptBackupBuffer(Buffer.from("VALID_DATA"));
  const badArchive = Buffer.from(dummy);
  badArchive[badArchive.length - 2] ^= 0xaa;

  if (process.env.PLANT_BREAK_RESTORE_BYPASS === "true") {
    // If break is active, this fails assertion (Red)
    assert.throws(() => brokenDecryptionBypass(badArchive));
  } else {
    // Production behavior: Passes (Green)
    assert.throws(
      () => brokenDecryptionBypass(badArchive),
      /Failed to decrypt backup\. Invalid key or corrupted file\./
    );
  }
});

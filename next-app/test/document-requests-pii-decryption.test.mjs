import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { encryptPII, decryptPII } = await import("../src/lib/piiEncryption.js");
const {
  decryptField,
  formatDocumentRequestRow,
  listDocumentRequests,
  getDocumentRequestById,
} = await import("../src/lib/documentRequestsRepo.js");

test("Document Requests PII Decryption Unit Suite", async (t) => {
  t.after(async () => {
    if (global.__pupsjPostgresPool) {
      await global.__pupsjPostgresPool.end();
    }
  });

  await t.test("1. decryptField handles plaintext, single encrypted tokens, and multi-token encrypted strings", () => {
    // Plaintext
    assert.equal(decryptField("Juan Dela Cruz"), "Juan Dela Cruz");
    assert.equal(decryptField(null), null);
    assert.equal(decryptField(undefined), undefined);

    // Single encrypted token
    const encSingle = encryptPII("Maria Clara");
    assert.ok(encSingle.startsWith("enc:v1:"));
    assert.equal(decryptField(encSingle), "Maria Clara");

    // Multi-token encrypted string (space-separated tokens from multiple fields)
    const encFirst = encryptPII("Jose");
    const encLast = encryptPII("Rizal");
    const combinedEnc = `${encFirst} ${encLast}`;
    assert.equal(decryptField(combinedEnc), "Jose Rizal");
  });

  await t.test("2. formatDocumentRequestRow decrypts encrypted raw fields and resolves student_name", () => {
    const rawRow = {
      id: 999,
      student_no: "2024-00001-SJ-0",
      raw_requester_name: encryptPII("Andres Bonifacio"),
      s_name: encryptPII("Andres Bonifacio"),
      sa_first_name: encryptPII("Andres"),
      sa_last_name: encryptPII("Bonifacio"),
      sa_email: encryptPII("andres@pup.local"),
      requester_contact: encryptPII("09123456789"),
    };

    const formatted = formatDocumentRequestRow(rawRow);
    assert.equal(formatted.requester_name, "Andres Bonifacio");
    assert.equal(formatted.student_name, "Andres Bonifacio");
    assert.equal(formatted.requester_email, "andres@pup.local");
    assert.equal(formatted.requester_contact, "09123456789");
    assert.ok(!formatted.student_name.includes("enc:v1:"));
  });

  await t.test("3. formatDocumentRequestRow gracefully falls back when requester_name is null", () => {
    const fallbackRow = {
      id: 998,
      student_no: "2024-00002-SJ-0",
      raw_requester_name: null,
      s_name: encryptPII("Emilio Aguinaldo"),
      sa_first_name: null,
      sa_last_name: null,
      sa_email: null,
    };

    const formatted = formatDocumentRequestRow(fallbackRow);
    assert.equal(formatted.student_name, "Emilio Aguinaldo");
    assert.equal(formatted.requester_name, "Emilio Aguinaldo");
  });

  await t.test("4. listDocumentRequests returns decrypted requester names from the database", async () => {
    const requests = await listDocumentRequests({ limit: 10 });
    assert.ok(Array.isArray(requests));
    assert.ok(requests.length > 0);

    for (const req of requests) {
      if (req.student_name) {
        assert.ok(!req.student_name.includes("enc:v1:"), `student_name in request #${req.id} should not contain raw ciphertext, got: ${req.student_name}`);
      }
      if (req.requester_name) {
        assert.ok(!req.requester_name.includes("enc:v1:"), `requester_name in request #${req.id} should not contain raw ciphertext, got: ${req.requester_name}`);
      }
      if (req.requester_email) {
        assert.ok(!req.requester_email.includes("enc:v1:"), `requester_email in request #${req.id} should not contain raw ciphertext, got: ${req.requester_email}`);
      }
    }
  });

  await t.test("5. getDocumentRequestById returns clean decrypted student_name and requester_name for request #36", async () => {
    const req36 = await getDocumentRequestById(36);
    if (req36) {
      assert.ok(!req36.student_name.includes("enc:v1:"));
      assert.ok(!req36.requester_name.includes("enc:v1:"));
      assert.equal(req36.student_name, "DELA CRUZ, JUAN A.");
      assert.equal(req36.requester_name, "student@pup.local");
    }
  });
});

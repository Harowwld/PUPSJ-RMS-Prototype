import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatLogDetails } from "../src/lib/auditLogFormatting.js";

describe("Audit Log Details Grammar Formatting", () => {
  test("Capitalizes the first letter of a simple sentence", () => {
    assert.strictEqual(
      formatLogDetails("removed custom profile avatar for student account"),
      "Removed custom profile avatar for student account"
    );
    assert.strictEqual(
      formatLogDetails("exported 5 student directory records to CSV"),
      "Exported 5 student directory records to CSV"
    );
    assert.strictEqual(
      formatLogDetails("restored academic program 'BSIT' from system archive"),
      "Restored academic program 'BSIT' from system archive"
    );
  });

  test("Capitalizes subsequent sentences following sentence punctuation", () => {
    assert.strictEqual(
      formatLogDetails("personnel rotated credentials. new password active."),
      "Personnel rotated credentials. New password active."
    );
    assert.strictEqual(
      formatLogDetails("session terminated! all tokens cleared? yes."),
      "Session terminated! All tokens cleared? Yes."
    );
  });

  test("Capitalizes text starting with quotes, parentheses, or brackets", () => {
    assert.strictEqual(
      formatLogDetails("'student' session started"),
      "'Student' session started"
    );
    assert.strictEqual(
      formatLogDetails("(\"info\") updated configuration"),
      "(\"Info\") updated configuration"
    );
    assert.strictEqual(
      formatLogDetails("student '2024-00001' successfully terminated session"),
      "Student '2024-00001' successfully terminated session"
    );
  });

  test("Normalizes common acronyms at sentence starts", () => {
    assert.strictEqual(
      formatLogDetails("ip auto-blocked due to suspicious activity"),
      "IP auto-blocked due to suspicious activity"
    );
    assert.strictEqual(
      formatLogDetails("2fa verification failed for personnel 'Marcus Reyes'"),
      "2FA verification failed for personnel 'Marcus Reyes'"
    );
    assert.strictEqual(
      formatLogDetails("csv export generated for audit trail"),
      "CSV export generated for audit trail"
    );
    assert.strictEqual(
      formatLogDetails("pdf report preview generated"),
      "PDF report preview generated"
    );
  });

  test("Preserves already-capitalized sentences and numeric details", () => {
    assert.strictEqual(
      formatLogDetails("Updated personal dashboard preferences."),
      "Updated personal dashboard preferences."
    );
    assert.strictEqual(
      formatLogDetails("Cleaned up 1 expired local backup(s)."),
      "Cleaned up 1 expired local backup(s)."
    );
    assert.strictEqual(
      formatLogDetails("12 rows (10 success, 2 failed)"),
      "12 rows (10 success, 2 failed)"
    );
  });

  test("Preserves raw JSON payloads intact", () => {
    const rawJson = '{"ip":"127.0.0.1","reason":"rate_limit"}';
    assert.strictEqual(formatLogDetails(rawJson), rawJson);
    const rawArray = '["item1", "item2"]';
    assert.strictEqual(formatLogDetails(rawArray), rawArray);
  });

  test("Handles null, undefined, empty string, and whitespace gracefully", () => {
    assert.strictEqual(formatLogDetails(null), "");
    assert.strictEqual(formatLogDetails(undefined), "");
    assert.strictEqual(formatLogDetails(""), "");
    assert.strictEqual(formatLogDetails("   "), "");
  });
});

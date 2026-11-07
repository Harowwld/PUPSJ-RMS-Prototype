import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseNarrativeTokens } from "../src/lib/narrativeParser.js";

describe("NarrativeText Tokenizer & Entity Parser", () => {
  test("Handles empty or null details gracefully", () => {
    assert.deepStrictEqual(parseNarrativeTokens(null), []);
    assert.deepStrictEqual(parseNarrativeTokens(""), []);
    assert.deepStrictEqual(parseNarrativeTokens(undefined), []);
  });

  test("Identifies person names preceded by student or account for", () => {
    const tokens = parseNarrativeTokens("provisioned new personnel account for 'Marcus Reyes' (ID: PUPREGISTRAR-002)");
    const mention = tokens.find((t) => t.type === "mention");
    assert.ok(mention, "Must find person mention token");
    assert.strictEqual(mention.value, "Marcus Reyes");

    const recordId = tokens.find((t) => t.type === "record_id");
    assert.ok(recordId, "Must find record_id token");
    assert.strictEqual(recordId.value, "PUPREGISTRAR-002");
  });

  test("Identifies student names in decline/review actions", () => {
    const tokens = parseNarrativeTokens("declined digital record for student 'Juan Dela Cruz' (Document: Transcript of Records). Reason: Missing official dry seal");
    const mention = tokens.find((t) => t.type === "mention");
    assert.ok(mention, "Must find student mention token");
    assert.strictEqual(mention.value, "Juan Dela Cruz");

    const keyValueTokens = tokens.filter((t) => t.type === "key_value");
    assert.strictEqual(keyValueTokens.length, 2, "Must find Document and Reason key_value tokens");
    assert.strictEqual(keyValueTokens[0].key, "Document");
    assert.strictEqual(keyValueTokens[0].value, "Transcript of Records");
    assert.strictEqual(keyValueTokens[1].key, "Reason");
    assert.strictEqual(keyValueTokens[1].value, "Missing official dry seal");
  });

  test("Identifies explicit @mentions and status transitions", () => {
    const tokens = parseNarrativeTokens("Officer @elias.austria moved request #42 (Pending → Ready)");
    const mention = tokens.find((t) => t.type === "mention");
    assert.ok(mention, "Must find explicit @mention token");
    assert.strictEqual(mention.value, "elias.austria");

    const recordId = tokens.find((t) => t.type === "record_id");
    assert.ok(recordId, "Must find request #42");
    assert.strictEqual(recordId.value, "#42");

    const transition = tokens.find((t) => t.type === "transition");
    assert.ok(transition, "Must find transition token");
    assert.strictEqual(transition.from, "Pending");
    assert.strictEqual(transition.to, "Ready");
  });

  test("Distinguishes non-person quoted entities like document types or codes", () => {
    const tokens = parseNarrativeTokens("Imported dataset 'BSIT-Curriculum-2024' into archive.");
    const quoted = tokens.find((t) => t.type === "quoted_entity");
    assert.ok(quoted, "Must find quoted entity token");
    assert.strictEqual(quoted.value, "BSIT-Curriculum-2024");
    assert.ok(!tokens.some((t) => t.type === "mention"), "Dataset must not be classified as a person");
  });

  test("Parses IPv4 addresses", () => {
    const tokens = parseNarrativeTokens("Suspicious attempt from 192.168.1.100 rejected.");
    const ip = tokens.find((t) => t.type === "ip_address");
    assert.ok(ip, "Must find ip_address token");
    assert.strictEqual(ip.value, "192.168.1.100");
  });

  test("Parses student numbers as record_id tokens", () => {
    const tokens = parseNarrativeTokens("Enrolled student 2024-00123 in BSIT program.");
    const idToken = tokens.find((t) => t.type === "record_id");
    assert.ok(idToken, "Must find student number record_id token");
    assert.strictEqual(idToken.value, "2024-00123");
  });

  test("Parses complex multi-sentence logs with mixed tokens", () => {
    const tokens = parseNarrativeTokens("Created office 'REGISTRAR' (ID: registrar). Status: Active. Assigned to @elias.austria.");
    const mention = tokens.find((t) => t.type === "mention");
    assert.strictEqual(mention.value, "elias.austria");
    const idToken = tokens.find((t) => t.type === "record_id");
    assert.strictEqual(idToken.value, "registrar");
    const kv = tokens.find((t) => t.type === "key_value" && t.key === "Status");
    assert.strictEqual(kv.value, "Active");
  });
});

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
    assert.strictEqual(recordId.value, "42");

    const transition = tokens.find((t) => t.type === "transition");
    assert.ok(transition, "Must find transition token");
    assert.strictEqual(transition.from, "Pending");
    assert.strictEqual(transition.to, "Ready");
  });

  test("Record IDs never put # in front of their value", () => {
    const tokens = parseNarrativeTokens("Updated ticket #98765 and proposal #PROP-4321 with document #123.");
    const idTokens = tokens.filter((t) => t.type === "record_id");
    assert.strictEqual(idTokens.length, 3);
    assert.strictEqual(idTokens[0].value, "98765");
    assert.strictEqual(idTokens[1].value, "PROP-4321");
    assert.strictEqual(idTokens[2].value, "123");
    for (const token of idTokens) {
      assert.ok(!token.value.startsWith("#"), `Token value ${token.value} must not start with #`);
    }
  });

  test("Resolves student@pup.local to Juan Dela Cruz in prose and parenthesized messages", () => {
    const tokens = parseNarrativeTokens("Event proposal submitted by President (student@pup.local).");
    const mention = tokens.find((t) => t.type === "mention");
    assert.ok(mention, "Must find mention for student@pup.local");
    assert.strictEqual(mention.value, "Juan Dela Cruz");
    assert.strictEqual(mention.email, "student@pup.local");

    const tokensQuoted = parseNarrativeTokens("student 'student@pup.local' authenticated");
    const mentionQuoted = tokensQuoted.find((t) => t.type === "mention");
    assert.ok(mentionQuoted, "Must find mention for quoted student@pup.local");
    assert.strictEqual(mentionQuoted.value, "Juan Dela Cruz");

    const tokensBare = parseNarrativeTokens("Official Post-Event Narrative Report and Liquidation package submitted by student@pup.local.");
    const mentionBare = tokensBare.find((t) => t.type === "mention");
    assert.ok(mentionBare, "Must find mention for bare student@pup.local");
    assert.strictEqual(mentionBare.value, "Juan Dela Cruz");
  });

  test("Resolves other institutional accounts like test.student@pup.local and superadmin@pup.local", () => {
    const tokens = parseNarrativeTokens("Reviewed by test.student@pup.local and approved by superadmin@pup.local.");
    const mentions = tokens.filter((t) => t.type === "mention");
    assert.strictEqual(mentions.length, 2);
    assert.strictEqual(mentions[0].value, "Maria Clara Santos");
    assert.strictEqual(mentions[1].value, "System Administrator");
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

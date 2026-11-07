import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { validateSecurityAnswer, isStrongSecurityAnswer } from "../src/lib/authSchemas.js";

test("Security Answer Strength: Rejects empty or whitespace-only answers", () => {
  assert.equal(validateSecurityAnswer("").valid, false);
  assert.equal(validateSecurityAnswer("   ").valid, false);
  assert.equal(validateSecurityAnswer(null).valid, false);
  assert.equal(validateSecurityAnswer(undefined).valid, false);
  assert.equal(isStrongSecurityAnswer(""), false);
});

test("Security Answer Strength: Rejects short answers (< 3 characters)", () => {
  const shortInputs = ["a", "1", "ok", "no", "x", " A ", " 12 "];
  for (const input of shortInputs) {
    const res = validateSecurityAnswer(input);
    assert.equal(res.valid, false, `Expected "${input}" to be rejected for length < 3`);
    assert.match(res.error, /at least 3 characters/i);
    assert.equal(isStrongSecurityAnswer(input), false);
  }
});

test("Security Answer Strength: Rejects punctuation-only or non-substantive entries", () => {
  const punctuationInputs = ["...", "---", "???", "!!!", "!?", " -.- "];
  for (const input of punctuationInputs) {
    const res = validateSecurityAnswer(input);
    assert.equal(res.valid, false, `Expected "${input}" to be rejected for lack of alphanumeric characters`);
    assert.equal(isStrongSecurityAnswer(input), false);
  }
});

test("Security Answer Strength: Rejects repetitive single-character sequences", () => {
  const repetitiveInputs = ["aaaa", "1111", "zzzzz", "BBBBBB", "......"];
  for (const input of repetitiveInputs) {
    const res = validateSecurityAnswer(input);
    assert.equal(res.valid, false, `Expected "${input}" to be rejected for repetitive characters`);
    assert.equal(isStrongSecurityAnswer(input), false);
  }
});

test("Security Answer Strength: Rejects common trivial placeholders", () => {
  const placeholders = [
    "none", "None", "NONE",
    "na", "NA", "N/A", "n/a",
    "null", "nil", "nothing",
    "test", "TEST", "testing",
    "placeholder", "sample", "default",
    "password", "secret", "admin", "answer", "security",
    "idk", "dont know", "dontknow", "no idea",
    "asdf", "qwerty", "1234", "12345", "123456"
  ];

  for (const placeholder of placeholders) {
    const res = validateSecurityAnswer(placeholder);
    assert.equal(res.valid, false, `Expected placeholder "${placeholder}" to be rejected`);
    assert.match(res.error, /common placeholder/i);
    assert.equal(isStrongSecurityAnswer(placeholder), false);
  }
});

test("Security Answer Strength: Rejects answers matching the question text", () => {
  const question = "What was the name of your first school?";
  
  // Exact match
  const exactRes = validateSecurityAnswer("What was the name of your first school?", question);
  assert.equal(exactRes.valid, false);
  assert.match(exactRes.error, /cannot match the question text/i);

  // Exact match without punctuation
  const noPunctRes = validateSecurityAnswer("what was the name of your first school", question);
  assert.equal(noPunctRes.valid, false);
  assert.match(noPunctRes.error, /cannot match the question text/i);

  // Verbatim question substring (>= 10 chars)
  const substrRes = validateSecurityAnswer("name of your first school", question);
  assert.equal(substrRes.valid, false);
  assert.match(substrRes.error, /cannot be copied from the question text/i);
});

test("Security Answer Strength: Accepts legitimate, strong, and varied answers", () => {
  const validCases = [
    { answer: "Tan", question: "What is your mother's maiden name?" },
    { answer: "Lee", question: "What is your mother's maiden name?" },
    { answer: "Ong", question: "What is your mother's maiden name?" },
    { answer: "Cruz", question: "What is your mother's maiden name?" },
    { answer: "Dela Cruz", question: "What is your mother's maiden name?" },
    { answer: "San Juan Elementary School", question: "What was the name of your first school?" },
    { answer: "Polytechnic University of the Philippines", question: "What was the name of your first school?" },
    { answer: "PUP San Juan", question: "What was the name of your first school?" },
    { answer: "Golden Retriever", question: "What was your first pet's breed?" },
    { answer: "Blueberry Cheesecake", question: "What is your favorite comfort food?" },
    { answer: "Baguio City", question: "In what city were you born?" },
  ];

  for (const { answer, question } of validCases) {
    const res = validateSecurityAnswer(answer, question);
    assert.equal(res.valid, true, `Expected "${answer}" to be valid for question "${question}", got error: ${res.error}`);
    assert.equal(isStrongSecurityAnswer(answer, question), true);
  }
});

test("Codebase Contract: PUT /api/staff/security enforces answer validation", () => {
  const routeCode = fs.readFileSync(path.resolve("src/app/api/staff/security/route.js"), "utf8");
  
  assert.ok(
    routeCode.includes("validateSecurityAnswer"),
    "route.js must import and call validateSecurityAnswer"
  );
  assert.ok(
    routeCode.includes("SELECT id, question, is_required FROM security_questions"),
    "saveSecurityAnswers must query the question text for validation"
  );
});

test("Codebase Contract: AccountSetupModal validates answer strength client-side", () => {
  const setupModalCode = fs.readFileSync(path.resolve("src/components/shared/AccountSetupModal.js"), "utf8");

  assert.ok(
    setupModalCode.includes("validateSecurityAnswer"),
    "AccountSetupModal must import and call validateSecurityAnswer"
  );
  assert.ok(
    setupModalCode.includes("Weak Security Answer"),
    "AccountSetupModal must notify the user of weak security answers"
  );
});

test("Codebase Contract: AccountSettingsPanel validates answer strength before TOTP verification", () => {
  const settingsPanelCode = fs.readFileSync(path.resolve("src/components/shared/AccountSettingsPanel.js"), "utf8");

  assert.ok(
    settingsPanelCode.includes("validateSecurityAnswer"),
    "AccountSettingsPanel must import and call validateSecurityAnswer"
  );
  assert.ok(
    settingsPanelCode.includes("Weak Security Answer"),
    "AccountSettingsPanel must notify the user of weak security answers before prompting for 2FA"
  );
});

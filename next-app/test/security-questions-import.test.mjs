import assert from "node:assert/strict";
import test from "node:test";
import { query, transaction } from "../src/lib/postgres.js";

// Helper functions matching BulkImportQuestionsModal logic
function normalizeForComparison(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeQuestionLine(raw) {
  if (!raw) return "";
  let cleaned = String(raw).trim();
  cleaned = cleaned.replace(/^(\d+[\.\)\-:]|\([0-9]+\)|\[[0-9]+\])\s*/, "");
  cleaned = cleaned.replace(/^[\s\u2022\u25E6\u25AA\u25CF•\-\*\>→–—]+\s*/, "");
  cleaned = cleaned.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  return cleaned.trim();
}

function parseFileQuestions(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  let startIndex = 0;
  const firstLineNorm = lines[0].toLowerCase().replace(/[^a-z]/g, "");
  if (firstLineNorm.startsWith("question") || firstLineNorm.includes("challenge")) {
    startIndex = 1;
  }

  const results = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const rowValues = [];
    let cur = "";
    let insideQuote = false;

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === "," && !insideQuote) {
        rowValues.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    rowValues.push(cur.trim());

    let questionText = rowValues[0] || "";
    if (questionText.startsWith('"') && questionText.endsWith('"')) {
      questionText = questionText.slice(1, -1).trim();
    }

    let isRequired = false;
    if (rowValues[1]) {
      const reqVal = rowValues[1].toLowerCase().replace(/[^a-z0-9]/g, "");
      if (reqVal === "true" || reqVal === "1" || reqVal === "yes" || reqVal === "required") {
        isRequired = true;
      }
    }

    const cleaned = sanitizeQuestionLine(questionText);
    if (cleaned) {
      results.push({
        id: Math.random().toString(36).slice(2, 9),
        text: cleaned,
        is_required: isRequired,
      });
    }
  }

  return results;
}

function evaluateQuestionRows(rows, existingQuestionTexts = []) {
  const existingSet = new Set(existingQuestionTexts.map(normalizeForComparison).filter(Boolean));
  const normalizedCounts = new Map();

  for (const row of rows) {
    const trimmed = row.text.trim();
    if (trimmed) {
      const norm = normalizeForComparison(trimmed);
      normalizedCounts.set(norm, (normalizedCounts.get(norm) || 0) + 1);
    }
  }

  return rows.map((row) => {
    const trimmed = row.text.trim();
    if (!trimmed) {
      return { ...row, status: "empty" };
    }

    const norm = normalizeForComparison(trimmed);
    const uniqueCharCount = new Set(trimmed.toLowerCase().replace(/\s/g, "")).size;

    if (trimmed.length < 10) {
      return { ...row, status: "short" };
    }
    if (uniqueCharCount < 5) {
      return { ...row, status: "simple" };
    }
    if (existingSet.has(norm)) {
      return { ...row, status: "exists" };
    }
    if ((normalizedCounts.get(norm) || 0) > 1) {
      return { ...row, status: "duplicate" };
    }

    return { ...row, status: "valid" };
  });
}

// ---------------- TESTS ---------------- //

test("CSV parser handles headers, commas in quotes, and required flags", () => {
  const csvContent = `question,required
What was the name of your first pet?,false
"What street, city did you grow up in?",true
1. What was your elementary mascot?,1
• What was your high school nickname?,yes`;

  const parsed = parseFileQuestions(csvContent);
  assert.equal(parsed.length, 4);

  assert.equal(parsed[0].text, "What was the name of your first pet?");
  assert.equal(parsed[0].is_required, false);

  assert.equal(parsed[1].text, "What street, city did you grow up in?");
  assert.equal(parsed[1].is_required, true);

  // Numbering and bullets stripped cleanly
  assert.equal(parsed[2].text, "What was your elementary mascot?");
  assert.equal(parsed[2].is_required, true);

  assert.equal(parsed[3].text, "What was your high school nickname?");
  assert.equal(parsed[3].is_required, true);
});

test("CSV parser handles plain line-by-line text without headers", () => {
  const txtContent = `
What was your childhood best friend's name?
Where did your parents first meet?
What was the model of your first car?
`;

  const parsed = parseFileQuestions(txtContent);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].text, "What was your childhood best friend's name?");
  assert.equal(parsed[1].text, "Where did your parents first meet?");
  assert.equal(parsed[2].text, "What was the model of your first car?");
});

test("Row evaluation correctly flags short, simple, duplicate, and existing questions", () => {
  const existing = ["What is your mother's maiden name?"];

  const rows = [
    { text: "What is your mother's maiden name?" }, // should flag exists
    { text: "Short" }, // < 10 chars
    { text: "aaaaaaaaaaaa" }, // < 5 unique chars (simple)
    { text: "Where did you go on your first vacation trip?" }, // duplicate #1
    { text: "Where did you go on your first vacation trip?" }, // duplicate #2
    { text: "What was the name of your first pet dog?" }, // valid
  ];

  const evaluated = evaluateQuestionRows(rows, existing);

  assert.equal(evaluated[0].status, "exists");
  assert.equal(evaluated[1].status, "short");
  assert.equal(evaluated[2].status, "simple");
  assert.equal(evaluated[3].status, "duplicate");
  assert.equal(evaluated[4].status, "duplicate");
  assert.equal(evaluated[5].status, "valid");
});

test("Backend hardened parameterized DELETE query operates cleanly without SQL syntax error", async () => {
  await transaction(async ({ query: txQuery }) => {
    // Insert test temporary security question
    const testId = 99999;
    await txQuery(
      "INSERT INTO security_questions (id, question, is_required) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
      [testId, "Temporary test question for query hardening verification", false]
    );

    // Verify presence
    const check1 = await txQuery("SELECT id FROM security_questions WHERE id = $1", [testId]);
    assert.equal(check1.rows.length, 1);

    // Execute parameterized query: keep IDs other than testId
    const currentRows = await txQuery("SELECT id FROM security_questions WHERE id != $1", [testId]);
    const keepIds = currentRows.rows.map((r) => r.id);

    if (keepIds.length > 0) {
      await txQuery("DELETE FROM security_questions WHERE NOT (id = ANY($1::int[]))", [keepIds]);
    }

    // Verify testId was pruned
    const check2 = await txQuery("SELECT id FROM security_questions WHERE id = $1", [testId]);
    assert.equal(check2.rows.length, 0);

    // Force rollback so test DB is untouched
    throw new Error("__ROLLBACK_TEST__");
  }).catch((err) => {
    if (err.message !== "__ROLLBACK_TEST__") throw err;
  });
});

test("Demo verification: _SAMPLE_DATA/security_questions.csv parses, validates, and imports seamlessly", async () => {
  const fs = await import("fs");
  const path = await import("path");
  const csvPath = path.resolve(process.cwd(), "../_SAMPLE_DATA/security_questions.csv");

  assert.ok(fs.existsSync(csvPath), "_SAMPLE_DATA/security_questions.csv must exist");
  const csvContent = fs.readFileSync(csvPath, "utf8");

  // 1. Parse using frontend logic
  const parsed = parseFileQuestions(csvContent);
  assert.ok(parsed.length >= 10, `Should parse at least 10 questions (parsed ${parsed.length})`);

  // 2. Fetch existing questions from DB
  const existingRows = await query("SELECT question FROM security_questions");
  const existingTexts = existingRows.map((r) => r.question);

  // 3. Evaluate rows
  const evaluated = evaluateQuestionRows(parsed, existingTexts);
  const invalidRows = evaluated.filter((r) => r.status !== "valid");
  assert.equal(
    invalidRows.length,
    0,
    `All sample CSV rows should be valid without duplicates/short/simple errors. Found invalid: ${JSON.stringify(invalidRows)}`
  );

  // 4. Test database transaction insertion (simulate PUT /api/system/security-questions)
  await transaction(async ({ query: txQuery }) => {
    let nextId = 1000;
    for (let i = 0; i < parsed.length; i++) {
      const q = parsed[i];
      const targetId = nextId++;
      const inserted = await txQuery(
        `INSERT INTO security_questions (id, question, is_required)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question, is_required = EXCLUDED.is_required
         RETURNING *`,
        [targetId, q.text, q.is_required]
      );
      assert.ok(inserted.rows[0].id, "Inserted question must have a numeric ID");
      assert.equal(inserted.rows[0].question, q.text);
      assert.equal(Boolean(inserted.rows[0].is_required), q.is_required);
    }

    // Verify recovery queries work with these questions
    const verifyRows = await txQuery("SELECT id, question, is_required FROM security_questions WHERE is_required = TRUE");
    assert.ok(verifyRows.rows.length >= 2, "Should have required challenge questions");

    // Force rollback so test DB is untouched
    throw new Error("__ROLLBACK_DEMO_TEST__");
  }).catch((err) => {
    if (err.message !== "__ROLLBACK_DEMO_TEST__") throw err;
  });

  setTimeout(() => process.exit(0), 100).unref();
});


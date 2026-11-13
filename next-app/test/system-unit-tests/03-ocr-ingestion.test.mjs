import test from "node:test";
import assert from "node:assert/strict";

const {
  extractNameFromCoordinates,
  detectDocType,
  normalizeExtractedName,
  formatToLNFnMi,
  rotateOcrPages,
  scanFileForSuggestion,
} = await import("../../src/lib/ocrClient.js");
const { matchStudentsByConfiguredOcrName } = await import("../../src/lib/studentNameMatcher.js");

test("Module 3.1: OCR (Ideal Case) - Extracts name fields from normalized coordinate regions", () => {
  const pages = [
    {
      pageIndex: 0,
      observations: [
        { text: "JUAN", x: 0.20, y: 0.30, width: 0.10, height: 0.02 },
        { text: "A.", x: 0.42, y: 0.30, width: 0.03, height: 0.02 },
        { text: "DELA CRUZ", x: 0.64, y: 0.30, width: 0.15, height: 0.02 },
      ],
    },
  ];

  const template = {
    page_index: 0,
    regions: {
      firstName: { x: 0.18, y: 0.28, width: 0.18, height: 0.08 },
      middleName: { x: 0.40, y: 0.28, width: 0.10, height: 0.08 },
      lastName: { x: 0.62, y: 0.28, width: 0.20, height: 0.08 },
    },
  };

  const result = extractNameFromCoordinates(pages, template);
  assert.ok(result, "Result should be returned");
  assert.equal(result.extractedName, "DELA CRUZ, JUAN A.");
  assert.equal(result.regions.firstName.text, "JUAN");
  assert.equal(result.regions.middleName.text, "A.");
  assert.equal(result.regions.lastName.text, "DELA CRUZ");
});

test("Module 3.2: OCR (Doc Type Detection) - Identifies document type from OCR keyword clusters", () => {
  const docTypes = [
    "Certificate of Live Birth",
    "Form 137 / SF10",
    "Transcript of Records",
    "Diploma",
  ];

  // PSA Birth Cert keywords
  const birthCertText = "PHILIPPINE STATISTICS AUTHORITY CERTIFICATE OF LIVE BIRTH REGISTRY NO 2024-12345 MOTHER FATHER";
  assert.equal(detectDocType(birthCertText, docTypes), "Certificate of Live Birth");

  // Form 137 / SF10 keywords
  const form137Text = "DEPARTMENT OF EDUCATION FORM 137-A SF10 LEARNER'S PERMANENT SCHOLASTIC RECORD GENERAL AVERAGE";
  assert.equal(detectDocType(form137Text, docTypes), "Form 137 / SF10");

  // Transcript keywords
  const torText = "POLYTECHNIC UNIVERSITY OF THE PHILIPPINES OFFICIAL TRANSCRIPT OF RECORDS GRADING SYSTEM UNITS EARNED";
  assert.equal(detectDocType(torText, docTypes), "Transcript of Records");

  // Diploma keywords
  const diplomaText = "HAS CONFERRED UPON THE DEGREE OF BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY";
  assert.equal(detectDocType(diplomaText, docTypes), "Diploma");
});

test("Module 3.3: OCR (Name Formatting) - Standardizes names with Philippine surname particles", () => {
  assert.equal(formatToLNFnMi("Juan Dela Cruz"), "DELA CRUZ, JUAN");
  assert.equal(formatToLNFnMi("Juan Antonio Dela Cruz"), "DELA CRUZ, JUAN A.");
  assert.equal(formatToLNFnMi("Maria Clara San Jose"), "SAN JOSE, MARIA C.");
  assert.equal(formatToLNFnMi("DELA CRUZ, JUAN ANTONIO"), "DELA CRUZ, JUAN A.");
});

test("Module 3.4: OCR (Low-Quality Case) - Fuzzy matcher links student within 10% mismatch ratio", () => {
  const students = [
    { student_no: "2025-10001-SJ-0", name: "DELA CRUZ, JUAN" },
    { student_no: "2025-10002-SJ-0", name: "DELA CRUZ, JOAN" },
  ];

  // Single OCR typo (JUANX vs JUAN) -> matches student 10001
  const oneTypoMatch = matchStudentsByConfiguredOcrName("DELA CRUZ, JUANX", students);
  assert.equal(oneTypoMatch.length, 1);
  assert.equal(oneTypoMatch[0].studentNo, "2025-10001-SJ-0");
  assert.ok(oneTypoMatch[0].mismatchPercent <= 10, "Typo should be within 10% threshold");

  // Multiple OCR typos exceeding 10% threshold -> no match
  const multiTypoMatch = matchStudentsByConfiguredOcrName("DELA CRUX, JXXN", students);
  assert.deepEqual(multiTypoMatch, [], "Excessive typos exceeding threshold must be rejected");
});

test("Module 3.5: OCR (Edge Case - Rotation) - Transforms coordinates on rotated pages accurately", () => {
  const pages = [
    {
      pageIndex: 0,
      width: 1000,
      height: 1400,
      observations: [
        { text: "JUAN", x: 0.20, y: 0.20, width: 0.05, height: 0.02 },
      ],
    },
  ];

  // Rotate 90 degrees clockwise
  const rotated = rotateOcrPages(pages, 90);
  assert.equal(rotated[0].width, 1400);
  assert.equal(rotated[0].height, 1000);

  // After 90 deg rotation, x becomes 1 - y - height, y becomes x
  const obs = rotated[0].observations[0];
  assert.equal(obs.text, "JUAN");
  assert.ok(Math.abs(obs.x - (1 - 0.20 - 0.02)) < 0.001);
  assert.ok(Math.abs(obs.y - 0.20) < 0.001);
});

test("Module 3.6: OCR (Edge Case - Caching) - Reuses prior OCR context without extra HTTP calls", async (t) => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    return { ok: true, json: async () => ({ ok: true, data: [] }) };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const cachedContext = {
    rawText: "JUAN DELA CRUZ",
    engine: "cached",
    pages: [{
      pageIndex: 0,
      width: 1000,
      height: 1400,
      observations: [{ text: "JUAN", x: 0.20, y: 0.20, width: 0.05, height: 0.02 }],
    }],
    templates: [],
  };

  const suggestion = await scanFileForSuggestion({
    file: { type: "application/pdf", name: "test-scan.pdf" },
    docTypes: ["Transcript of Records"],
    rotation: 0,
    matchStudents: false,
    ocrContext: cachedContext,
  });

  assert.equal(suggestion.ocrContext.engine, "cached");
  assert.equal(requests.length, 0, "No fetch requests should be triggered when ocrContext is cached");
});

test("Module 3.7: OCR (Negative Case) - Unsupported file formats throw clear validation errors", async () => {
  // Invalid non-PDF and non-image file (.txt)
  const invalidFile = { type: "text/plain", name: "notes.txt" };

  await assert.rejects(
    async () => scanFileForSuggestion({ file: invalidFile, docTypes: [] }),
    /Unsupported file type/i,
    "Non-PDF/image file must be rejected immediately"
  );

  // Missing file object
  await assert.rejects(
    async () => scanFileForSuggestion({ file: null, docTypes: [] }),
    /Missing file/i,
    "Null file must throw missing file error"
  );
});

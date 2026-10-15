import test from "node:test";
import assert from "node:assert/strict";
import { extractNameFromCoordinates, matchStudentsByConfiguredOcrName, normalizeExtractedName, rotateOcrPages, scanFileForSuggestion } from "../src/lib/ocrClient.js";

test("extracts PSA name fields from normalized coordinate regions", () => {
  const result = extractNameFromCoordinates([
    {
      pageIndex: 0,
      observations: [
        { text: "OUTSIDE", x: 0.10, y: 0.30, width: 0.10, height: 0.02 },
        { text: "JUAN", x: 0.20, y: 0.30, width: 0.10, height: 0.02 },
        { text: "A.", x: 0.42, y: 0.30, width: 0.03, height: 0.02 },
        { text: "(Middle)", x: 0.45, y: 0.29, width: 0.04, height: 0.02 },
        { text: "12", x: 0.47, y: 0.31, width: 0.02, height: 0.02 },
        { text: "DELA CRUZ", x: 0.64, y: 0.30, width: 0.15, height: 0.02 },
        { text: "MOTHER", x: 0.20, y: 0.70, width: 0.15, height: 0.02 },
      ],
    },
  ], {
    page_index: 0,
    regions: {
      firstName: { x: 0.18, y: 0.28, width: 0.18, height: 0.08 },
      middleName: { x: 0.40, y: 0.28, width: 0.10, height: 0.08 },
      lastName: { x: 0.62, y: 0.28, width: 0.20, height: 0.08 },
    },
  });

  assert.equal(result.extractedName, "DELA CRUZ, JUAN A.");
  assert.equal(result.regions.firstName.text, "JUAN");
  assert.equal(result.regions.middleName.text, "A.");
  assert.equal(result.regions.lastName.text, "DELA CRUZ");
  assert.equal(result.regions.lastName.observations.length, 1);
});

test("returns evidence but no name when a required PSA field is absent", () => {
  const result = extractNameFromCoordinates([{ pageIndex: 1, observations: [] }], {
    page_index: 1,
    regions: {
      firstName: { x: 0, y: 0, width: 0.2, height: 0.1 },
      middleName: { x: 0.2, y: 0, width: 0.2, height: 0.1 },
      lastName: { x: 0.4, y: 0, width: 0.2, height: 0.1 },
    },
  });
  assert.equal(result.extractedName, "");
  assert.equal(result.pageIndex, 1);
});

test("normalizes extracted names into the project format", () => {
  assert.equal(normalizeExtractedName("Juan dela Cruz"), "DELA CRUZ, JUAN");
  assert.equal(normalizeExtractedName("DELA CRUZ, JUAN A."), "DELA CRUZ, JUAN A");
});

test("configured-name matching allows up to 10 percent letter edits and rejects more", () => {
  const students = [
    { student_no: "2025-10001-SJ-0", name: "DELA CRUZ, JUAN" },
    { student_no: "2025-10002-SJ-0", name: "DELA CRUZ, JOAN" },
  ];

  const oneTypo = matchStudentsByConfiguredOcrName("DELA CRUZ, JUANX", students);
  assert.deepEqual(oneTypo.map((student) => student.studentNo), ["2025-10001-SJ-0"]);
  assert.equal(oneTypo[0].mismatchPercent, 8);

  const twoTypos = matchStudentsByConfiguredOcrName("DELA CRUX, JXXN", students);
  assert.deepEqual(twoTypos, []);
});

test("bounded matcher preserves the previous edit-distance result across name lengths and accents", () => {
  const referenceNormalize = (value) => normalizeExtractedName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  const referenceDistance = (left, right) => {
    const row = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 1; i <= left.length; i += 1) {
      let diagonal = row[0];
      row[0] = i;
      for (let j = 1; j <= right.length; j += 1) {
        const above = row[j];
        row[j] = left[i - 1] === right[j - 1]
          ? diagonal
          : Math.min(diagonal + 1, row[j] + 1, row[j - 1] + 1);
        diagonal = above;
      }
    }
    return row[right.length];
  };
  const names = [
    "DELA CRUZ, JUAN",
    "NUÑEZ, MARÍA LUISA",
    "VAN DER MEER, JOSEPHINE",
    "SANTOS, ANA",
    "GARCIA, CHRISTOPHER ANDREW",
  ];
  const cases = names.flatMap((name) => {
    const normalized = referenceNormalize(name);
    return [name, `${name}X`, name.replace(/[AEIOU]/, "X"), `${name}XX`].map((ocrName) => ({ ocrName, name, normalized }));
  });
  const students = cases.map((item, index) => ({ student_no: `S${index}`, name: item.name }));

  for (const { ocrName } of cases) {
    const normalizedOcr = referenceNormalize(ocrName);
    const expected = students.flatMap((student) => {
      const normalizedStudent = referenceNormalize(student.name);
      if (normalizedOcr.length < 8 || normalizedStudent.length < 8) return [];
      const ratio = referenceDistance(normalizedOcr, normalizedStudent) / Math.max(normalizedOcr.length, normalizedStudent.length);
      return ratio <= 0.10 ? [{ studentNo: student.student_no, mismatchPercent: Math.round(ratio * 100) }] : [];
    }).sort((left, right) => left.mismatchPercent - right.mismatchPercent || left.studentNo.localeCompare(right.studentNo));
    const actual = matchStudentsByConfiguredOcrName(ocrName, students)
      .map(({ studentNo, mismatchPercent }) => ({ studentNo, mismatchPercent }));
    assert.deepEqual(actual, expected, `matches differ for ${ocrName}`);
  }
});

test("rotating OCR observations reuses OCR output and applies configured coordinates to the rotated page", () => {
  const pages = [{ pageIndex: 0, width: 1000, height: 1400, observations: [
    { text: "JUAN", x: 0.20, y: 0.20, width: 0.05, height: 0.02 },
  ] }];
  const rotated = rotateOcrPages(pages, 90);
  assert.deepEqual([rotated[0].width, rotated[0].height], [1400, 1000]);
  const result = extractNameFromCoordinates(rotated, {
    page_index: 0,
    regions: {
      firstName: { x: 0.74, y: 0.19, width: 0.1, height: 0.1 },
      middleName: { x: 0.4, y: 0.1, width: 0.1, height: 0.1 },
      lastName: { x: 0.5, y: 0.1, width: 0.1, height: 0.1 },
    },
  });
  assert.equal(result.regions.firstName.text, "JUAN");
});

test("rotation reuses prior OCR pages and templates without calling the OCR endpoint again", async (t) => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    return { ok: true, json: async () => ({ ok: true, data: [] }) };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  await scanFileForSuggestion({
    file: { type: "application/pdf", name: "record.pdf" },
    docTypes: [],
    rotation: 90,
    matchStudents: false,
    ocrContext: {
      rawText: "JUAN DELA CRUZ",
      engine: "test",
      pages: [{
        pageIndex: 0,
        width: 1000,
        height: 1400,
        observations: [{ text: "JUAN", x: 0.20, y: 0.20, width: 0.05, height: 0.02 }],
      }],
      templates: [{
        page_index: 0,
        regions: {
          firstName: { x: 0.74, y: 0.19, width: 0.1, height: 0.1 },
          middleName: { x: 0.4, y: 0.1, width: 0.1, height: 0.1 },
          lastName: { x: 0.5, y: 0.1, width: 0.1, height: 0.1 },
        },
      }],
    },
  });

  assert.deepEqual(requests, []);
});

test("OCR suggestion does not match full-page text without a configured name extraction", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).startsWith("/api/ingest/ocr")) {
      return { ok: true, json: async () => ({ ok: true, text: "Student No. 2025-10001-SJ-0\nJuan Dela Cruz", pages: [], engine: "test" }) };
    }
    return { ok: true, json: async () => ({ ok: true, data: [] }) };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const suggestion = await scanFileForSuggestion({
    file: { type: "application/pdf", name: "record.pdf" },
    students: [{ student_no: "2025-10001-SJ-0", name: "DELA CRUZ, JUAN" }],
    docTypes: [],
  });

  assert.equal(suggestion.docType, "");
  assert.match(suggestion.ocrTextPreview, /2025-10001-SJ-0/);
  assert.deepEqual(suggestion.studentMatches, []);
});

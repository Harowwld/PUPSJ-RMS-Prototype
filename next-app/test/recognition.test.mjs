import test from "node:test";
import assert from "node:assert/strict";
import { extractNameFromCoordinates, normalizeExtractedName } from "../src/lib/ocrClient.js";
import { calculateOcrConfidence } from "../src/lib/ocrConfidence.js";

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

test("scores the same name strongly when OCR and database order differ", () => {
  const result = calculateOcrConfidence({
    extractedName: "GABRIEL MATEO SANTOS RAMIREZ",
    candidate: { studentNo: "2025-60009-MN-2", name: "RAMIREZ, GABRIEL MATEO SANTOS" },
    candidates: [{ studentNo: "2025-60009-MN-2", name: "RAMIREZ, GABRIEL MATEO SANTOS" }],
    extractionSource: "template",
  });
  assert.ok(result.matchConfidence >= 0.9);
  assert.equal(result.evidence.candidates[0].tokenSetSimilarity, 1);
});

test("keeps a strong unique match usable despite a non-primary document name conflict", () => {
  const result = calculateOcrConfidence({
    extractedName: "LIAM CARTER VALENCIA MERCADO",
    candidate: { studentNo: "2025-60010-MN-0", name: "MERCADO, LIAM CARTER VALENCIA" },
    candidates: [{ studentNo: "2025-60010-MN-0", name: "MERCADO, LIAM CARTER VALENCIA" }],
    extractionSource: "template",
    conflictingCandidates: [{ studentNo: "2022-10002-MN-2", name: "SANTOS, MARIA B." }],
  });
  assert.equal(result.matchBand, "Conflict");
  assert.ok(result.matchConfidence >= 0.85);
});

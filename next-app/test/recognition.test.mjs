import test from "node:test";
import assert from "node:assert/strict";
import { extractNameFromCoordinates, normalizeExtractedName } from "../src/lib/ocrClient.js";

test("extracts PSA name fields from normalized coordinate regions", () => {
  const result = extractNameFromCoordinates([
    {
      pageIndex: 0,
      observations: [
        { text: "JUAN", x: 0.20, y: 0.30, width: 0.10, height: 0.02 },
        { text: "A.", x: 0.42, y: 0.30, width: 0.03, height: 0.02 },
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

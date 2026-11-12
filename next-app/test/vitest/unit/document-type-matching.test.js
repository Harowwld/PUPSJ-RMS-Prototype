import { describe, expect, it } from "vitest";
import examples from "../../fixtures/document-type-examples.json";
import { detectDocType } from "../../../src/lib/ocrClient.js";

const docTypes = [...new Set([
  ...examples.map((example) => example.expected),
  "CTC Grade 10 Report Card", "CTC Grade 11 Report Card",
  "Grade 12 Report Card (1st and 2nd Semester)", "SAR Form (circled)",
])];

describe("Registrar document-type detection", () => {
  for (const example of examples) {
    it(`recognizes ${example.file} from content with all types available`, () => {
      expect(detectDocType(example.text, docTypes, { requireEvidence: true })).toBe(example.expected);
    });
  }
  it("does not treat a program preference or a listed requirement as the document title", () => {
    expect(detectDocType("CAEPUP 2022 APPLICATION FORM\nACADEMIC PROGRAM PREFERENCES\nDiploma in Information Technology\nBachelor of Science in Accountancy\nRequirements: good moral certificate, report card", docTypes)).toBe("CAEPUP 2023 Application Form");
  });
  it("recognizes a title when native OCR keeps its explanatory subtitle on the same line", () => {
    expect(detectDocType("SAR-FORM 1\nWITH CONFIRMATION DOCUMENTS\nConfirmation Slip (For a 4- or 5-year degree, or 3-year diploma program)\nGraduated in 2023", docTypes)).toBe("Confirmation Slip");
  });
  it("does not guess a type for unreadable or generic text", () => {
    expect(detectDocType("", docTypes, { requireEvidence: true })).toBe("");
    expect(detectDocType("School Year 2023-2024\nName: Sample Student\nBachelor of Science in Information Technology", docTypes, { requireEvidence: true })).toBe("");
    expect(detectDocType("graduated mother father general average form certification", docTypes, { requireEvidence: true })).toBe("");
  });
  it("only returns a configured label and leaves a missing specific type unassigned", () => {
    expect(detectDocType("ROUTE AND APPROVAL SLIP", ["Diploma", "CAEPUP 2023 Application Form"], { requireEvidence: true })).toBe("");
  });
  it("distinguishes grade-specific report cards", () => {
    for (const [grade, expected] of [[10, "CTC Grade 10 Report Card"], [11, "CTC Grade 11 Report Card"], [12, "Grade 12 Report Card (1st and 2nd Semester)"]]) {
      expect(detectDocType(`GRADE ${grade} REPORT CARD\nSchool Year 2023-2024`, docTypes)).toBe(expected);
    }
  });
});

import test from "node:test";
import assert from "node:assert/strict";

const {
  StudentNoSchema,
  PersonNameSchema,
  PhoneSchema,
  StudentRegistrationSchema,
} = await import("../../src/lib/validationSchemas.js");
const { normalizeExtractedName, formatToLNFnMi } = await import("../../src/lib/ocrClient.js");

test("Module 2.1: Student Records - Schema validates compliant student registration data", () => {
  const validStudent = {
    studentNo: "2024-00123-SJ-0",
    name: "DELA CRUZ, JUAN A.",
    courseCode: "BSIT",
    yearLevel: 2024,
    section: "1",
    room: 1,
    cabinet: "A",
    drawer: 2,
  };

  const result = StudentRegistrationSchema.safeParse(validStudent);
  assert.equal(result.success, true, "Valid student object should pass schema validation");
});

test("Module 2.2: Data Normalization - Student names and numbers are normalized properly", () => {
  // Test whitespace and capitalization normalization
  const rawNames = [
    ["Juan dela Cruz", "DELA CRUZ, JUAN"],
    ["DELA CRUZ, JUAN A.", "DELA CRUZ, JUAN A"],
    ["  santos ,  maria  clara  ", "SANTOS, MARIA CLARA"],
    ["PEDRO PENDUKO", "PENDUKO, PEDRO"],
    ["ANA MARIE SAN JOSE", "SAN JOSE, ANA MARIE"],
  ];

  for (const [input, expected] of rawNames) {
    const normalized = normalizeExtractedName(input);
    assert.equal(normalized, expected, `Expected '${input}' to normalize to '${expected}'`);
  }

  // Format to standard Lastname, Firstname M.I.
  const formatted = formatToLNFnMi("DELA CRUZ, JUAN ANTONIO");
  assert.equal(formatted, "DELA CRUZ, JUAN A.");
});

test("Module 2.3: Validation Constraints - Malformed student numbers and dummy names are rejected", () => {
  // Invalid Student Numbers
  const invalidStudentNumbers = [
    "invalid-no",
    "123",
    "2024/00123/SJ/0",
    "",
    "   ",
    "2024-ABCDE-SJ-0", // Non-digits
  ];

  for (const studentNo of invalidStudentNumbers) {
    const res = StudentNoSchema.safeParse(studentNo);
    assert.equal(res.success, false, `Student number '${studentNo}' must be rejected`);
  }

  // Invalid Dummy / Numeric Names
  const nameValidator = PersonNameSchema("Student Name");
  const badNames = [
    "12345",
    "N/A",
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "A",
    "!@#$%^",
  ];

  for (const bad of badNames) {
    const res = nameValidator.safeParse(bad);
    assert.equal(res.success, false, `Name '${bad}' must be rejected`);
  }
});

test("Module 2.4: Field Integrity - Phone numbers and course codes meet format requirements", () => {
  // Philippine mobile numbers
  const validPhones = ["09171234567", "+639171234567", "09987654321"];
  for (const phone of validPhones) {
    const res = PhoneSchema.safeParse(phone);
    assert.equal(res.success, true, `Phone '${phone}' should be valid`);
  }

  const invalidPhones = ["123", "+1-555-555-55555555", "abcdefghijk", ""];
  for (const phone of invalidPhones) {
    const res = PhoneSchema.safeParse(phone);
    assert.equal(res.success, false, `Phone '${phone}' should be rejected`);
  }
});

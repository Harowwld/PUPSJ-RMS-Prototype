import test from "node:test";
import assert from "node:assert/strict";
import {
  StudentNoSchema,
  PersonNameSchema,
  PhoneSchema,
  LoginIdentifierSchema,
  StudentRegistrationSchema,
  StaffRegistrationSchema,
  StudentDocumentRequestSchema,
} from "../src/lib/validationSchemas.js";

test("PersonNameSchema correctly rejects numeric dummy inputs and accepts legitimate names", () => {
  const nameValidator = PersonNameSchema("Full Name");

  // Rejections
  const badNames = [
    "12345",
    "1234567890",
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "",
    "   ",
    "A",
    "!!!@@@###",
    "9999-0000",
  ];
  for (const bad of badNames) {
    const res = nameValidator.safeParse(bad);
    assert.equal(res.success, false, `Expected '${bad}' to be rejected as a name`);
  }

  // Acceptances
  const goodNames = [
    "Juan Dela Cruz",
    "Maria Santos-Reyes",
    "Ma. Teresa O'Connor",
    "John Paul II.",
    "Jose Rizal",
    "TEST AUTONOMOUS STUDENT EDITED",
  ];
  for (const good of goodNames) {
    const res = nameValidator.safeParse(good);
    assert.equal(res.success, true, `Expected '${good}' to be accepted as a valid name`);
  }
});

test("StudentNoSchema validates PUP and testing student number formats and blocks arbitrary strings", () => {
  // Rejections
  const badStudentNos = [
    "lorem ipsum",
    "12345",
    "999999999999",
    "random-text-without-digits",
    "ABC",
    "invalid student number",
    "",
    "   ",
  ];
  for (const bad of badStudentNos) {
    const res = StudentNoSchema.safeParse(bad);
    assert.equal(res.success, false, `Expected '${bad}' to be rejected as a Student Number`);
  }

  // Acceptances
  const goodStudentNos = [
    "2024-00123-SJ-0",
    "2023-00456-SJ-0",
    "2021-00892",
    "ALUM-2019-001",
    "ALUMNI-2018-099",
    "TEST-123456-SJ-0",
    "BSIT-001-SJ",
  ];
  for (const good of goodStudentNos) {
    const res = StudentNoSchema.safeParse(good);
    assert.equal(res.success, true, `Expected '${good}' to be accepted as a Student Number`);
  }
});

test("PhoneSchema enforces valid Philippine mobile numbers and rejects text strings", () => {
  // Rejections
  const badPhones = [
    "lorem ipsum",
    "123",
    "09123",
    "abcd1234efgh",
    "999999999999999999999",
    "random numbers here",
  ];
  for (const bad of badPhones) {
    const res = PhoneSchema.safeParse(bad);
    assert.equal(res.success, false, `Expected '${bad}' to be rejected as a phone number`);
  }

  // Acceptances
  const goodPhones = [
    "09171234567",
    "+639171234567",
    "639171234567",
    "02-81234567",
    "049-5123456",
  ];
  for (const good of goodPhones) {
    const res = PhoneSchema.safeParse(good);
    assert.equal(res.success, true, `Expected '${good}' to be accepted as a valid phone number`);
  }
});

test("LoginIdentifierSchema rejects invalid text and allows valid emails, student numbers, and staff IDs", () => {
  // Rejections
  const badIdentifiers = [
    "lorem ipsum",
    "123",
    "not an email address",
    "random text with spaces",
    "",
    "ab",
  ];
  for (const bad of badIdentifiers) {
    const res = LoginIdentifierSchema.safeParse(bad);
    assert.equal(res.success, false, `Expected '${bad}' to be rejected as a login identifier`);
  }

  // Acceptances
  const goodIdentifiers = [
    "admin.registrar@pup.local",
    "user@pup.edu.ph",
    "2024-00123-SJ-0",
    "PUPREGISTRAR-001",
    "PUPSUPERADMIN-001",
    "superadmin",
    "admin",
  ];
  for (const good of goodIdentifiers) {
    const res = LoginIdentifierSchema.safeParse(good);
    assert.equal(res.success, true, `Expected '${good}' to be accepted as a valid login identifier`);
  }
});

test("StudentRegistrationSchema rejects pure digits in name and invalid student numbers", () => {
  const invalidPayload = {
    studentNo: "lorem ipsum",
    name: "123456789", // pure numbers
    courseCode: "BSIT",
    yearLevel: 2024,
    section: "1-1",
    room: 1,
    cabinet: "A",
    drawer: 1,
    status: "Active",
  };
  const res = StudentRegistrationSchema.safeParse(invalidPayload);
  assert.equal(res.success, false);

  const validPayload = {
    studentNo: "2024-00123-SJ-0",
    name: "JUAN DELA CRUZ",
    courseCode: "BSIT",
    yearLevel: 2024,
    section: "1-1",
    room: 1,
    cabinet: "A",
    drawer: 1,
    status: "Active",
  };
  const validRes = StudentRegistrationSchema.safeParse(validPayload);
  assert.equal(validRes.success, true);
});

test("StaffRegistrationSchema rejects pure numbers in first and last name", () => {
  const invalidPayload = {
    fname: "12345",
    lname: "67890",
    role: "Staff",
    section: "Records",
    email: "not-an-email",
    officeId: "registrar",
  };
  const res = StaffRegistrationSchema.safeParse(invalidPayload);
  assert.equal(res.success, false);

  const validPayload = {
    fname: "Marcus",
    lname: "Reyes",
    role: "Staff",
    section: "Records",
    email: "staff.registrar@pup.local",
    officeId: "registrar",
  };
  const validRes = StaffRegistrationSchema.safeParse(validPayload);
  assert.equal(validRes.success, true);
});

test("StudentDocumentRequestSchema enforces phone number and notes length", () => {
  const invalidRequest = {
    clientType: "Student",
    studentNo: "2024-00123-SJ-0",
    docType: "Transcript of Records",
    notes: "hi", // Too short (< 5 chars)
    requesterContact: "lorem ipsum", // Not a phone number
  };
  const res = StudentDocumentRequestSchema.safeParse(invalidRequest);
  assert.equal(res.success, false);

  const validRequest = {
    clientType: "Student",
    studentNo: "2024-00123-SJ-0",
    docType: "Transcript of Records",
    notes: "Official copy needed for scholarship application",
    requesterContact: "09171234567",
  };
  const validRes = StudentDocumentRequestSchema.safeParse(validRequest);
  assert.equal(validRes.success, true);
});

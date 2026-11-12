import { beforeEach, expect, it, vi } from "vitest";
import { query, transaction } from "../../../src/lib/postgres.js";
import { getStudentChecklist, normalizeChecklistStudentNo } from "../../../src/lib/studentChecklist.js";

vi.mock("../../../src/lib/postgres.js", () => ({ query: vi.fn(), transaction: vi.fn() }));

const account = { accountId: 42, clientType: "Student" };
const types = [{ id: 1, name: "PSA Birth Certificate" }, { id: 2, name: "Grade 12 Report Card" }];
const tx = { queryOne: vi.fn(), query: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  query.mockResolvedValueOnce(types);
  transaction.mockImplementation((callback) => callback(tx));
  tx.queryOne.mockResolvedValue({ exists: true });
  tx.query.mockResolvedValue({ rows: [{ name: "Birth Certificate", original_filename: "secret.pdf" }] });
});

it("shows generic requirements while verification is pending", async () => {
  query.mockResolvedValueOnce([{ reference: "review-ref", status: "Pending", verified_student_no: null }]);
  const data = await getStudentChecklist(account);
  expect(data.verification).toBeNull();
  expect(data.requirements.every((item) => !("status" in item))).toBe(true);
  expect(transaction).not.toHaveBeenCalled();
});

it("returns scan-based statuses after verification, without exposing scan metadata", async () => {
  query.mockResolvedValueOnce([{ status: "Verified", verified_student_no: "2024-12345-SJ-0" }]);
  const data = await getStudentChecklist(account);
  expect(data.requirements).toEqual([
    { id: 1, name: "PSA Birth Certificate", docType: "PSA Birth Certificate", category: "Admission & Identity", description: expect.stringContaining("Official birth certificate"), instructions: expect.stringContaining("PSA Serbilis"), source: { label: "View PSA Request Options", href: "https://psa.gov.ph/birth-certificate" }, status: "Submitted" },
    { id: 2, name: "Grade 12 Report Card", docType: "Grade 12 Report Card", category: "Academic Records", description: expect.stringContaining("Senior High School Final Report Card"), instructions: expect.stringContaining("both semesters"), source: { label: "View DepEd Records Guide", href: "https://www.deped.gov.ph/wp-content/uploads/DepEd-Citizens-Charter-2025.pdf" }, status: "Missing" },
  ]);
  const [statusQuery, parameters] = tx.query.mock.lastCall;
  expect(statusQuery).toContain("FROM documents");
  expect(statusQuery).toContain("approval_status <> 'Declined'");
  expect(statusQuery).not.toContain("registrar_checklist_receipts");
  expect(parameters).toEqual(["2024-12345-SJ-0"]);
  expect(data.summary.missingCount).toBe(1);
});

it("hides personal statuses when a previously verified Registrar membership is inactive", async () => {
  query.mockResolvedValueOnce([{ status: "Verified", verified_student_no: "2024-12345-SJ-0" }]);
  tx.queryOne.mockResolvedValue(null);
  const data = await getStudentChecklist(account);
  expect(data.unavailable).toBe(true);
  expect(data.student).toBeUndefined();
  expect(tx.query).not.toHaveBeenCalled();
});

it("does not reveal personal statuses to parent accounts", async () => {
  query.mockResolvedValueOnce([]);
  const data = await getStudentChecklist({ ...account, clientType: "Parent", studentNo: "2024-12345-SJ-0" });
  expect(data.student).toBeUndefined();
  expect(transaction).not.toHaveBeenCalled();
});

it("validates only student-number format before a verification request", () => {
  expect(normalizeChecklistStudentNo(" 2024-12345-sj-0 ")).toBe("2024-12345-SJ-0");
  expect(normalizeChecklistStudentNo("invalid number")).toBeNull();
});

it("shows general requirements when the verification table has not been migrated", async () => {
  query.mockRejectedValueOnce(Object.assign(new Error("missing relation"), { code: "42P01" }));
  const data = await getStudentChecklist(account);
  expect(data.verificationUnavailable).toBe(true);
  expect(data.requirements.map(({ name }) => name)).toEqual(types.map(({ name }) => name));
  expect(data.requirements.every((item) => !("status" in item))).toBe(true);
});

it("does not report missing submissions when the scan query fails because its table is unavailable", async () => {
  query.mockResolvedValueOnce([]);
  tx.query.mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(Object.assign(new Error("missing relation"), { code: "42P01" }));
  const data = await getStudentChecklist({ ...account, studentNo: "2024-12345-SJ-0" });
  expect(data.verificationUnavailable).toBe(true);
  expect(data.student).toBeUndefined();
  expect(data.summary).toBeUndefined();
});

it("keeps the checklist general when the entered number does not match the verified enrollment email", async () => {
  query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  const data = await getStudentChecklist({ ...account, checklistStudentNo: "2024-12345-SJ-0" });
  expect(data.needsEnrollmentMatch).toBe(true);
  expect(transaction).not.toHaveBeenCalled();
  expect(query).toHaveBeenLastCalledWith(expect.stringContaining("contact.email = sip.email"), [42, "2024-12345-SJ-0"]);
});

it("shows personal statuses only after the enrollment email match is rechecked", async () => {
  query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ student_no: "2024-12345-SJ-0" }]);
  const data = await getStudentChecklist({ ...account, checklistStudentNo: "2024-12345-SJ-0" });
  expect(data.student.studentNo).toBe("2024-12345-SJ-0");
  expect(tx.queryOne).toHaveBeenCalledWith(expect.stringContaining("FOR SHARE OF contact, sip"), [42, "2024-12345-SJ-0"]);
});

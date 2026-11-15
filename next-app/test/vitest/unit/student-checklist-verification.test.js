import { beforeEach, expect, it, vi } from "vitest";
import { requireStaff } from "../../../src/lib/authHelpers.js";
import { transaction } from "../../../src/lib/postgres.js";
import { POST as reviewVerification } from "../../../src/app/api/registrar/checklist/route.js";

vi.mock("../../../src/lib/postgres.js", () => ({ query: vi.fn(), transaction: vi.fn() }));
vi.mock("../../../src/lib/authHelpers.js", () => ({
  requireStudent: vi.fn(),
  requireStaff: vi.fn(),
  createAuthErrorResponse: vi.fn(),
}));
vi.mock("../../../src/lib/auditLogRequest.js", () => ({ writeAuditLog: vi.fn() }));

const reference = "123456ABCDEF";
const studentNo = "2024-12345-SJ-0";
const tx = { queryOne: vi.fn(), query: vi.fn() };
const request = (body) => new Request("http://localhost", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.resetAllMocks();
  requireStaff.mockResolvedValue({ user: { id: "staff-id", officeId: "registrar" } });
  transaction.mockImplementation((callback) => callback(tx));
  tx.queryOne.mockResolvedValue({ requested_student_no: studentNo });
  tx.query.mockResolvedValue({ rows: [{ student_no: studentNo }] });
});

it("requires the in-person student number to match the pending reference before approval", async () => {
  const response = await reviewVerification(request({ action: "approve", reference, confirmed: true, studentNo: "2024-23456-SJ-0" }));
  expect(response.status).toBe(409);
  expect(tx.query).not.toHaveBeenCalled();
});

it("lets Registrar staff confirm a matching record without changing account linkage", async () => {
  const response = await reviewVerification(request({ action: "approve", reference, confirmed: true, studentNo }));
  expect(response.status).toBe(200);
  expect(tx.query).toHaveBeenCalledTimes(2);
  expect(tx.query).toHaveBeenLastCalledWith(expect.stringContaining("UPDATE student_checklist_verifications"), [reference, "Verified", studentNo, "staff-id"]);
});

it("rejects non-Registrar staff before accessing verification data", async () => {
  requireStaff.mockResolvedValue({ user: { id: "staff-id", officeId: "osas" } });
  const response = await reviewVerification(request({ action: "approve", reference, confirmed: true, studentNo }));
  expect(response.status).toBe(403);
  expect(transaction).not.toHaveBeenCalled();
});

import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "../../../src/app/api/student/document-requests/route.js";
import { requireStudent } from "../../../src/lib/authHelpers.js";
import { queryOne } from "../../../src/lib/postgres.js";

vi.mock("../../../src/lib/authHelpers.js", () => ({ requireStudent: vi.fn(), createAuthErrorResponse: vi.fn() }));
vi.mock("../../../src/lib/postgres.js", () => ({ query: vi.fn(), queryOne: vi.fn(), transaction: vi.fn() }));
vi.mock("../../../src/lib/auditLogRequest.js", () => ({ writeGlobalAuditLog: vi.fn() }));

const body = { requestKind: "missing_documents", studentNo: "2024-12345-SJ-0", notes: "Check my missing documents." };
const request = (input) => new Request("http://localhost", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
});

beforeEach(() => {
  vi.resetAllMocks();
  queryOne.mockResolvedValue({ id: 1 });
});

it("checks the account affiliation even if a current student claims to be alumni", async () => {
  requireStudent.mockResolvedValue({ user: { accountId: 1, clientType: "Student" } });
  const response = await POST(request({ ...body, clientType: "Alumni" }));
  expect(response.status).toBe(403);
});

it("requires identity evidence for alumni inquiries", async () => {
  requireStudent.mockResolvedValue({ user: { accountId: 1, clientType: "Alumni" } });
  const response = await POST(request(body));
  expect(response.status).toBe(400);
  expect((await response.json()).error).toMatch(/government-issued ID/);
});

it("requires the setup step before an inquiry can be submitted", async () => {
  requireStudent.mockResolvedValue({ user: { accountId: 1, clientType: "Alumni", portalSetupComplete: false } });
  const response = await POST(request(body));
  expect(response.status).toBe(403);
  expect((await response.json()).error).toMatch(/Complete account setup/);
});

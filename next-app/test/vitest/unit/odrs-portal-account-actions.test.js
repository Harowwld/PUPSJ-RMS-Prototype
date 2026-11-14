import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(), transaction: vi.fn(), query: vi.fn(), queryOne: vi.fn(), txQuery: vi.fn(),
  send: vi.fn(), audit: vi.fn(), rateLimit: vi.fn(),
}));
vi.mock("@/lib/authHelpers", () => ({
  requireSystemAdmin: mocks.authorize,
  createAuthErrorResponse: (_, status) => new Response(null, { status }),
}));
vi.mock("@/lib/postgres", () => ({ transaction: mocks.transaction, query: mocks.query }));
vi.mock("@/lib/accountEmail", () => ({ assertAccountEmailConfigured: vi.fn(), sendPasswordResetEmail: mocks.send }));
vi.mock("@/lib/auditLogRequest", () => ({ writeGlobalAuditLog: mocks.audit }));
vi.mock("@/lib/rateLimiter", () => ({ checkAuthForgotPasswordRateLimit: mocks.rateLimit }));
vi.mock("@/lib/odrsPortalAccountsRepo", () => ({ listOdrsPortalAccounts: vi.fn() }));

import { PATCH } from "@/app/api/admin/odrs-portal-accounts/route";

function request(action) {
  return new Request("http://localhost:3000/api/admin/odrs-portal-accounts", {
    method: "PATCH",
    body: JSON.stringify({ id: "42", action }),
  });
}

beforeEach(() => {
  mocks.authorize.mockResolvedValue({ user: { id: "ADMIN" } });
  mocks.rateLimit.mockResolvedValue({ allowed: true });
  mocks.transaction.mockImplementation((callback) => callback({ queryOne: mocks.queryOne, query: mocks.txQuery }));
});

it("rejects staff before modifying the portal account", async () => {
  mocks.authorize.mockResolvedValue({ error: "Access denied" });
  expect((await PATCH(request("deactivate"))).status).toBe(403);
  expect(mocks.transaction).not.toHaveBeenCalled();
});

it("revokes student sessions and outstanding reset links when deactivating", async () => {
  mocks.queryOne.mockResolvedValue({ id: "42" });
  expect((await PATCH(request("deactivate"))).status).toBe(200);
  expect(mocks.queryOne).toHaveBeenCalledWith(expect.stringContaining("AND status = $3"), ["42", "Inactive", "Active"]);
  expect(mocks.txQuery).toHaveBeenCalledWith(expect.stringContaining("principal_type = 'student'"), ["42"]);
  expect(mocks.txQuery).toHaveBeenCalledWith(expect.stringContaining("UPDATE password_reset_tokens"), ["42"]);
});

it("does not issue a reset link if the registered email is unverified", async () => {
  mocks.queryOne.mockResolvedValue({ email: "student@example.com" });
  expect((await PATCH(request("send-reset"))).status).toBe(409);
  expect(mocks.txQuery).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
});

it("invalidates the reset link if delivery fails", async () => {
  mocks.queryOne.mockResolvedValue({ email: "student@example.com", portal_email_verified_at: new Date() });
  mocks.send.mockRejectedValueOnce(new Error("Email unavailable"));
  expect((await PATCH(request("send-reset"))).status).toBe(502);
  const [, [, tokenHash]] = mocks.txQuery.mock.calls.find(([sql]) => sql.includes("INSERT INTO password_reset_tokens"));
  expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("WHERE token_hash = $1"), [tokenHash]);
  expect(mocks.audit).not.toHaveBeenCalled();
});

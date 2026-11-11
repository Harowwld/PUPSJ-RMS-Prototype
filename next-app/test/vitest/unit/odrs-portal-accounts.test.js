import { beforeEach, expect, it, vi } from "vitest";
import { query, transaction } from "../../../src/lib/postgres.js";
import { listOdrsPortalAccounts, matchOdrsPortalAccount } from "../../../src/lib/odrsPortalAccountsRepo.js";

vi.mock("../../../src/lib/postgres.js", () => ({ query: vi.fn(), transaction: vi.fn() }));

const email = "student@example.com";
const studentNo = "2024-00123-SJ-0";
const account = { id: "42", email, client_type: "Student", status: "Active", student_no: null };
const db = { query: vi.fn(), queryOne: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  transaction.mockImplementation((callback) => callback(db));
  db.queryOne.mockResolvedValueOnce({ student_no: studentNo }).mockResolvedValue(null);
  db.query.mockResolvedValueOnce({ rows: [account] });
});

it("lists portal accounts including unlinked accounts without returning credentials", async () => {
  query.mockResolvedValue([{ ...account, password_hash: "private", totp_secret: "private" }]);

  const [row] = await listOdrsPortalAccounts();
  expect(row).toMatchObject({ id: "42", email, affiliation: "Student", studentNo: null });
  expect(row).not.toHaveProperty("password_hash");
  expect(row).not.toHaveProperty("totp_secret");
});

it("looks up an account without changing the record and links only on confirmation", async () => {
  const match = await matchOdrsPortalAccount(studentNo, email);
  expect(match.account.studentNo).toBeNull();
  expect(db.query).toHaveBeenCalledTimes(1);

  db.queryOne.mockResolvedValueOnce({ student_no: studentNo });
  db.query.mockResolvedValueOnce({ rows: [account] });
  const linked = await matchOdrsPortalAccount(studentNo, email, "42");

  expect(linked.account.studentNo).toBe(studentNo);
  expect(db.query).toHaveBeenLastCalledWith(
    expect.stringMatching(/^UPDATE student_accounts SET student_no/),
    [studentNo, "42"],
  );
});

it("rejects a parent account and leaves the student record unlinked", async () => {
  db.query.mockReset().mockResolvedValue({ rows: [{ ...account, client_type: "Parent" }] });

  expect(await matchOdrsPortalAccount(studentNo, email, "42")).toMatchObject({ status: 409 });
  expect(db.query).toHaveBeenCalledTimes(1);
});

it("keeps a student record with an existing portal account from being linked again", async () => {
  db.queryOne.mockReset().mockResolvedValueOnce({ student_no: studentNo }).mockResolvedValueOnce({ id: "17" });

  expect(await matchOdrsPortalAccount(studentNo, email, "42")).toMatchObject({ status: 409 });
  expect(db.query).toHaveBeenCalledTimes(1);
});

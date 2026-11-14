import { expect, it, vi } from "vitest";
import { query } from "../../../src/lib/postgres.js";
import { listOdrsPortalAccounts } from "../../../src/lib/odrsPortalAccountsRepo.js";

vi.mock("../../../src/lib/postgres.js", () => ({ query: vi.fn() }));

const email = "student@example.com";
const account = { id: "42", email, client_type: "Student", status: "Active", student_no: null, avatar_filename: "avatar_student.png" };

it("lists portal accounts including unlinked accounts without returning credentials", async () => {
  query.mockResolvedValue([{ ...account, password_hash: "private", totp_secret: "private" }]);

  const [row] = await listOdrsPortalAccounts();
  expect(row).toMatchObject({ id: "42", email, affiliation: "Student", studentNo: null, avatarFilename: "avatar_student.png" });
  expect(row).not.toHaveProperty("password_hash");
  expect(row).not.toHaveProperty("totp_secret");
});

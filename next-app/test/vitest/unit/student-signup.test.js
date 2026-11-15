import { beforeEach, describe, expect, it, vi } from "vitest";
import { query, transaction } from "../../../src/lib/postgres.js";
import { registerStudent, studentSignupEmailExists } from "../../../src/lib/studentAuth.js";
import { sendStudentSignupCode } from "../../../src/lib/accountEmail.js";
import {
  completeStudentSignup,
  sendSignupChallenge,
} from "../../../src/lib/studentSignup.js";

vi.mock("../../../src/lib/postgres.js", () => ({ query: vi.fn(), transaction: vi.fn() }));
vi.mock("../../../src/lib/studentAuth.js", () => ({ registerStudent: vi.fn(), studentSignupEmailExists: vi.fn() }));
vi.mock("../../../src/lib/accountEmail.js", () => ({ sendStudentSignupCode: vi.fn() }));

const email = "example@gmail.com";
const signup = {
  firstName: "Maria",
  clientType: "Parent",
  lastName: "Santos",
  password: "Test-Signup-2026!",
};
const tx = { queryOne: vi.fn(), query: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("JWT_SECRET", "student-signup-test-secret");
  transaction.mockImplementation((callback) => callback(tx));
});

describe("student signup", () => {
  it("rejects an existing email before creating a challenge or sending a code", async () => {
    studentSignupEmailExists.mockResolvedValue(true);

    await expect(sendSignupChallenge(email)).rejects.toMatchObject({
      status: 409,
      message: "An account with this email address already exists. Please sign in.",
    });
    expect(studentSignupEmailExists).toHaveBeenCalledWith(email);
    expect(query).not.toHaveBeenCalled();
    expect(sendStudentSignupCode).not.toHaveBeenCalled();
  });

  it("emails a six-digit code and never returns it to the requesting browser", async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ challenge_id: "created" }]);

    const response = await sendSignupChallenge(email);

    expect(response).toEqual({ challengeId: expect.any(String) });
    expect(sendStudentSignupCode).toHaveBeenCalledWith({ to: email, code: expect.stringMatching(/^\d{6}$/) });
    const [, params] = query.mock.calls[1];
    expect(params[0]).not.toBe(email);
    expect(params[2]).toMatch(/^[a-f0-9]{64}$/);
    expect(registerStudent).not.toHaveBeenCalled();
  });

  async function issueChallenge() {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ challenge_id: "created" }]);
    const { challengeId } = await sendSignupChallenge(email);
    const [{ code }] = sendStudentSignupCode.mock.calls[0];
    tx.queryOne.mockResolvedValue({ code_hash: query.mock.calls[1][1][2] });
    return { challengeId, code };
  }

  it("counts incorrect codes without creating an account", async () => {
    const challenge = await issueChallenge();
    const wrongCode = challenge.code === "000000" ? "000001" : "000000";

    await expect(completeStudentSignup(email, { ...signup, ...challenge, code: wrongCode })).rejects.toThrow("incorrect");
    expect(tx.query).toHaveBeenCalledWith(expect.stringContaining("attempts_remaining - 1"), expect.any(Array));
    expect(registerStudent).not.toHaveBeenCalled();
  });

  it("rejects missing and previously consumed codes", async () => {
    await expect(completeStudentSignup(email, signup)).rejects.toThrow("Enter the six-digit");
    const challenge = await issueChallenge();
    tx.queryOne.mockResolvedValue(null);
    await expect(completeStudentSignup(email, { ...signup, ...challenge })).rejects.toThrow("used up");
    expect(registerStudent).not.toHaveBeenCalled();
  });

  it("consumes the correct code and creates a verified account with portal setup pending in the same transaction", async () => {
    const challenge = await issueChallenge();
    registerStudent.mockResolvedValue({ id: 1 });

    await expect(completeStudentSignup(email, { ...signup, ...challenge })).resolves.toEqual({ id: 1 });
    expect(registerStudent).toHaveBeenCalledWith(
      { ...signup, email, middleName: "", name: "SANTOS, MARIA" },
      { tx },
    );
    expect(tx.query).toHaveBeenCalledWith(expect.stringContaining("portal_setup_complete = FALSE"), [1]);
    expect(tx.query).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM student_signup_verifications"), expect.any(Array));
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown affiliation before consuming a verified signup", async () => {
    const challenge = await issueChallenge();
    await expect(completeStudentSignup(email, {
      ...signup,
      ...challenge,
      clientType: "Staff",
    })).rejects.toThrow("Select your affiliation");
    expect(transaction).not.toHaveBeenCalled();
  });
});

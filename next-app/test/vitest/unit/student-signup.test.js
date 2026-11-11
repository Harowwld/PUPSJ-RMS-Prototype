import { beforeEach, describe, expect, it, vi } from "vitest";
import { query, transaction } from "../../../src/lib/postgres.js";
import { registerStudent } from "../../../src/lib/studentAuth.js";
import { sendStudentSignupCode } from "../../../src/lib/accountEmail.js";
import {
  completeStudentSignup,
  sendSignupChallenge,
  verifySignupChallenge,
} from "../../../src/lib/studentSignup.js";

vi.mock("../../../src/lib/postgres.js", () => ({ query: vi.fn(), transaction: vi.fn() }));
vi.mock("../../../src/lib/studentAuth.js", () => ({ registerStudent: vi.fn() }));
vi.mock("../../../src/lib/accountEmail.js", () => ({ sendStudentSignupCode: vi.fn() }));

const email = "example@gmail.com";
const requiredQuestion = { id: 2, question: "What was the name of your first school?" };
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
  tx.query.mockResolvedValue({ rows: [requiredQuestion] });
});

describe("student signup", () => {
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

  it("counts incorrect codes and only issues setup credentials after a matching code", async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ challenge_id: "created" }]);
    const { challengeId } = await sendSignupChallenge(email);
    const [{ code }] = sendStudentSignupCode.mock.calls[0];
    tx.queryOne.mockResolvedValue({ code_hash: query.mock.calls[1][1][2] });
    const wrongCode = code === "000000" ? "000001" : "000000";

    await expect(verifySignupChallenge(email, challengeId, wrongCode)).rejects.toThrow("incorrect");
    expect(tx.query).toHaveBeenCalledWith(expect.stringContaining("attempts_remaining - 1"), expect.any(Array));

    await expect(verifySignupChallenge(email, challengeId, code)).resolves.toEqual({
      setupToken: expect.stringMatching(/^[a-f0-9]{64}$/),
      questions: [requiredQuestion],
    });
    expect(registerStudent).not.toHaveBeenCalled();
  });

  it("rejects missing, invalid, and previously consumed setup credentials", async () => {
    await expect(completeStudentSignup(email, signup)).rejects.toThrow("Verify your email");
    tx.queryOne.mockResolvedValue(null);
    await expect(completeStudentSignup(email, { ...signup, setupToken: "a".repeat(64) })).rejects.toThrow("expired");
    expect(registerStudent).not.toHaveBeenCalled();
  });

  it("requires recovery answers and passes only hashed answers to account creation", async () => {
    const setupToken = "a".repeat(64);
    tx.queryOne.mockResolvedValue({ email_key: "verified" });
    await expect(completeStudentSignup(email, { ...signup, setupToken })).rejects.toThrow("Answer cannot be empty");
    expect(registerStudent).not.toHaveBeenCalled();

    registerStudent.mockResolvedValue({ id: 1 });
    const answers = { 2: "Maple Ridge Academy" };
    await expect(completeStudentSignup(email, { ...signup, setupToken, answers })).resolves.toEqual({ id: 1 });
    expect(registerStudent).toHaveBeenCalledWith(
      { ...signup, email, middleName: "", name: "SANTOS, MARIA" },
      { tx, securityAnswers: [{ questionId: 2, answerHash: expect.any(String) }] },
    );
    expect(registerStudent.mock.calls[0][1].securityAnswers[0].answerHash).not.toBe(answers[2].toLowerCase());
  });

  it("rejects an unknown affiliation before consuming a verified signup", async () => {
    await expect(completeStudentSignup(email, {
      ...signup,
      setupToken: "a".repeat(64),
      clientType: "Staff",
    })).rejects.toThrow("Select your affiliation");
    expect(transaction).not.toHaveBeenCalled();
  });
});

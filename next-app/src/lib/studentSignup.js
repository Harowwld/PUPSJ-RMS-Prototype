import { isStudentAffiliation } from "./studentAffiliation.js";
import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { query, transaction } from "./postgres.js";
import { hashPassword } from "./passwordHash.js";
import { validatePasswordPolicy } from "./passwordPolicy.js";
import { validateSecurityAnswer } from "./authSchemas.js";
import { registerStudent } from "./studentAuth.js";
import { sendStudentSignupCode } from "./accountEmail.js";
import { formatRegistrarStudentName, PersonNameSchema } from "./validationSchemas.js";

export class StudentSignupError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function signupEmail(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (email.length > 100 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9-]+\.)+[a-z0-9-]+$/.test(email)) {
    throw new StudentSignupError("Enter a valid email address.");
  }
  return email;
}

function digest(purpose, value) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET environment variable");
  return createHmac("sha256", secret).update(purpose).update("\0").update(value).digest("hex");
}

export async function sendSignupChallenge(email, setupToken) {
  const emailKey = digest("student-signup-email", email);
  const challengeId = randomUUID();
  const code = String(randomInt(1_000_000)).padStart(6, "0");
  await query("DELETE FROM student_signup_verifications WHERE expires_at <= NOW()");
  const rows = await query(
    `INSERT INTO student_signup_verifications AS pending
       (email_key, challenge_id, code_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')
     ON CONFLICT (email_key) DO UPDATE SET
       challenge_id = EXCLUDED.challenge_id, code_hash = EXCLUDED.code_hash,
       sent_at = NOW(), expires_at = EXCLUDED.expires_at,
       attempts_remaining = 5, setup_token_hash = NULL
     WHERE (pending.setup_token_hash IS NULL OR pending.setup_token_hash = $4)
       AND pending.sent_at <= NOW() - INTERVAL '1 minute'
     RETURNING challenge_id`,
    [
      emailKey, challengeId, digest(challengeId, code),
      typeof setupToken === "string" && /^[a-f0-9]{64}$/.test(setupToken)
        ? digest("student-signup-setup", setupToken) : null,
    ],
  );
  if (!rows.length) throw new StudentSignupError("Wait before requesting another code. If you already verified your email, finish account setup.", 429);
  try {
    await sendStudentSignupCode({ to: email, code });
  } catch (error) {
    console.error("Student verification email failed:", error?.code || error?.name);
    await query("DELETE FROM student_signup_verifications WHERE email_key = $1 AND challenge_id = $2", [emailKey, challengeId]);
    throw new StudentSignupError("We couldn't send the verification code. Check the email address or contact your administrator.", 503);
  }
  return { challengeId };
}

const requiredQuestions = "SELECT id, question FROM security_questions WHERE is_required = TRUE ORDER BY id";

export async function verifySignupChallenge(email, challengeId, code) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code) || typeof challengeId !== "string" || !/^[a-f0-9-]{36}$/.test(challengeId)) {
    throw new StudentSignupError("Enter the six-digit verification code.");
  }

  const emailKey = digest("student-signup-email", email);
  const result = await transaction(async (tx) => {
    const challenge = await tx.queryOne(
      `SELECT code_hash FROM student_signup_verifications
       WHERE email_key = $1 AND challenge_id::text = $2 AND expires_at > NOW()
         AND attempts_remaining > 0 AND setup_token_hash IS NULL
       FOR UPDATE`,
      [emailKey, challengeId],
    );
    if (!challenge) return null;

    if (!timingSafeEqual(Buffer.from(challenge.code_hash, "hex"), Buffer.from(digest(challengeId, code), "hex"))) {
      await tx.query(
        "UPDATE student_signup_verifications SET attempts_remaining = attempts_remaining - 1 WHERE email_key = $1",
        [emailKey],
      );
      return null;
    }

    const setupToken = randomBytes(32).toString("hex");
    await tx.query(
      `UPDATE student_signup_verifications
       SET setup_token_hash = $2, expires_at = NOW() + INTERVAL '15 minutes'
       WHERE email_key = $1`,
      [emailKey, digest("student-signup-setup", setupToken)],
    );
    const { rows: questions } = await tx.query(requiredQuestions);
    return { setupToken, questions };
  });
  if (!result) throw new StudentSignupError("That code is incorrect, expired, or used up. Check your code or request a new one.");
  return result;
}

export function validateStudentSignupDetails(body) {
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const middleName = typeof body.middleName === "string" ? body.middleName.trim() : "";
  if (!PersonNameSchema("First name").safeParse(firstName).success
      || !PersonNameSchema("Last name").safeParse(lastName).success || middleName.length > 100) {
    throw new StudentSignupError("Enter a valid first and last name.");
  }
  const password = typeof body.password === "string" ? body.password : "";
  const policy = validatePasswordPolicy(password);
  if (!policy.valid) throw new StudentSignupError(policy.reason);
  return { firstName, lastName, middleName, password };
}

export async function completeStudentSignup(email, body) {
  if (typeof body.setupToken !== "string" || !/^[a-f0-9]{64}$/.test(body.setupToken)) {
    throw new StudentSignupError("Verify your email before completing account setup.");
  }
  const details = validateStudentSignupDetails(body);
  const clientType = body.clientType;
  if (!isStudentAffiliation(clientType)) {
    throw new StudentSignupError("Select your affiliation to continue.");
  }

  try {
    return await transaction(async (tx) => {
      const consumed = await tx.queryOne(
        `DELETE FROM student_signup_verifications
         WHERE email_key = $1 AND setup_token_hash = $2 AND expires_at > NOW()
         RETURNING email_key`,
        [digest("student-signup-email", email), digest("student-signup-setup", body.setupToken)],
      );
      if (!consumed) throw new StudentSignupError("Account setup expired. Start registration again.");
      const { rows: questions } = await tx.query(requiredQuestions);
      const securityAnswers = questions.map(({ id, question }) => {
        const value = body.answers?.[id];
        const answer = typeof value === "string" ? value.trim() : "";
        const validation = validateSecurityAnswer(answer, question);
        if (!validation.valid) throw new StudentSignupError(`${question} ${validation.error}`);
        return { questionId: id, answerHash: hashPassword(answer.toLowerCase()) };
      });
      const name = formatRegistrarStudentName(details);
      return registerStudent({ email, name, clientType, ...details }, { tx, securityAnswers });
    });
  } catch (error) {
    if (error.code === "23505" || error.message === "An account with this email address already exists. Please sign in.") {
      throw new StudentSignupError("An account with this email address already exists. Please sign in.", 409);
    }
    throw error;
  }
}

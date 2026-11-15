import { isDemoAccount } from "./demoAccounts.js";
import { isStudentAffiliation } from "./studentAffiliation.js";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { query, transaction } from "./postgres.js";
import { validatePasswordPolicy } from "./passwordPolicy.js";
import { registerStudent, studentSignupEmailExists } from "./studentAuth.js";
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

export async function sendSignupChallenge(email) {
  if (isDemoAccount(email)) throw new StudentSignupError("This email address is reserved for a demo account.", 409);
  if (await studentSignupEmailExists(email)) {
    throw new StudentSignupError("An account with this email address already exists. Please sign in.", 409);
  }
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
     WHERE pending.sent_at <= NOW() - INTERVAL '1 minute'
     RETURNING challenge_id`,
    [
      emailKey, challengeId, digest(challengeId, code),
    ],
  );
  if (!rows.length) throw new StudentSignupError("Wait before requesting another code.", 429);
  try {
    await sendStudentSignupCode({ to: email, code });
  } catch (error) {
    console.error("Student verification email failed:", error?.code || error?.name);
    await query("DELETE FROM student_signup_verifications WHERE email_key = $1 AND challenge_id = $2", [emailKey, challengeId]);
    throw new StudentSignupError("We couldn't send the verification code. Check the email address or contact your administrator.", 503);
  }
  return { challengeId };
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
  const { challengeId, code, clientType } = body;
  if (typeof code !== "string" || !/^\d{6}$/.test(code)
      || typeof challengeId !== "string" || !/^[a-f0-9-]{36}$/.test(challengeId)) {
    throw new StudentSignupError("Enter the six-digit verification code.");
  }
  const details = validateStudentSignupDetails(body);
  if (clientType !== undefined && !isStudentAffiliation(clientType)) {
    throw new StudentSignupError("Select your affiliation to continue.");
  }

  const emailKey = digest("student-signup-email", email);
  try {
    const account = await transaction(async (tx) => {
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

      const name = formatRegistrarStudentName(details);
      const student = await registerStudent({ email, name, clientType, ...details }, { tx });
      await tx.query(
        `UPDATE student_identity_profiles SET portal_setup_complete = FALSE, portal_email_verified_at = NOW()
         WHERE id = (SELECT identity_profile_id FROM student_accounts WHERE id = $1)`,
        [student.id],
      );
      await tx.query("DELETE FROM student_signup_verifications WHERE email_key = $1", [emailKey]);
      return student;
    });
    if (!account) throw new StudentSignupError("That code is incorrect, expired, or used up. Check your code or request a new one.");
    return account;
  } catch (error) {
    if (error.code === "23505" || error.message === "An account with this email address already exists. Please sign in.") {
      throw new StudentSignupError("An account with this email address already exists. Please sign in.", 409);
    }
    throw error;
  }
}

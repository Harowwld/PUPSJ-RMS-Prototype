import { z } from "zod";

const PUP_STUDENT_NO_REGEX =
  /^(\d{4}-\d{4,6}-[A-Z]{2}-\d|\d{4}-\d{4,6}|ALUM-\d+.*|ALUMNI-\d+.*|TEST-\d+.*|[A-Z]{3,6}-\d{3,6}.*)$/i;
const PUP_STAFF_ID_REGEX =
  /^(PUP[A-Z0-9]+-\d{2,4}|[A-Z]{3,15}-\d{2,4})$/i;

export const LoginIdentifierSchema = z
  .string({ required_error: "Identifier is required" })
  .trim()
  .min(3, "Identifier must be at least 3 characters")
  .max(100, "Identifier is too long")
  .refine(
    (val) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const isStudentNo = PUP_STUDENT_NO_REGEX.test(val);
      const isStaffId = PUP_STAFF_ID_REGEX.test(val);
      const isDemo = /^(superadmin|admin|staff)$/i.test(val);
      return isEmail || isStudentNo || isStaffId || isDemo;
    },
    "Please enter a valid institutional email, Student Number (e.g. 2024-00123-SJ-0), or Staff ID (e.g. PUPREGISTRAR-001)"
  );

export const LoginSchema = z.object({
  username: LoginIdentifierSchema,
  password: z.string().min(1, "Password is required"),
  staffEmailCode: z.string().regex(/^\d{6}$/, "Enter the six-digit verification code.").optional(),
  resendStaffEmailCode: z.boolean().optional(),
});

export const ForgotPasswordIdentifySchema = z.object({
  identifier: LoginIdentifierSchema,
});

const EmailPasswordResetSchema = z.object({
  resetToken: z.string().min(1, "Reset token is required").trim(),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
});

const SecurityQuestionPasswordResetSchema = z.object({
  id: z.string().trim().min(1, "Staff ID is required"),
  questionId: z.number().int().positive(),
  answer: z.string().trim().min(1, "Answer is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
});

export const ForgotPasswordResetSchema = z.union([
  EmailPasswordResetSchema,
  SecurityQuestionPasswordResetSchema,
]);

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
});

const COMMON_SECURITY_PLACEHOLDERS = new Set([
  "none",
  "na",
  "n/a",
  "null",
  "nil",
  "nothing",
  "unknown",
  "blank",
  "empty",
  "test",
  "testing",
  "sample",
  "default",
  "placeholder",
  "answer",
  "security",
  "password",
  "secret",
  "admin",
  "idk",
  "dontknow",
  "dont know",
  "no idea",
  "asdf",
  "qwerty",
  "1234",
  "12345",
  "123456",
  "12345678",
]);

export function validateSecurityAnswer(answerRaw, questionText = "") {
  const answer = String(answerRaw || "").trim();
  if (!answer) {
    return { valid: false, error: "Answer cannot be empty." };
  }

  // 1. Common placeholder check
  const normalized = answer.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (COMMON_SECURITY_PLACEHOLDERS.has(normalized) || COMMON_SECURITY_PLACEHOLDERS.has(answer.toLowerCase())) {
    return {
      valid: false,
      error: "Please provide a specific answer instead of a common placeholder.",
    };
  }

  // 2. Length boundaries
  if (answer.length < 3) {
    return {
      valid: false,
      error: "Answer must be at least 3 characters long.",
    };
  }
  if (answer.length > 100) {
    return {
      valid: false,
      error: "Answer cannot exceed 100 characters.",
    };
  }

  // 3. Alphanumeric content check
  const alphanumericOnly = answer.replace(/[^a-zA-Z0-9]/g, "");
  if (alphanumericOnly.length < 2) {
    return {
      valid: false,
      error: "Answer must contain at least 2 alphanumeric characters.",
    };
  }

  // 4. Repetition / Low entropy check
  const uniqueChars = new Set(answer.toLowerCase().replace(/\s/g, "")).size;
  if (uniqueChars < 2) {
    return {
      valid: false,
      error: "Answer cannot consist of repetitive characters.",
    };
  }

  // 5. Question reflection / text matching check
  if (questionText) {
    const cleanQ = String(questionText)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .trim()
      .replace(/\s+/g, " ");
    const cleanA = answer
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .trim()
      .replace(/\s+/g, " ");

    if (cleanA === cleanQ) {
      return {
        valid: false,
        error: "Answer cannot match the question text.",
      };
    }

    if (cleanA.length >= 10 && cleanQ.includes(cleanA)) {
      return {
        valid: false,
        error: "Answer cannot be copied from the question text.",
      };
    }
  }

  return { valid: true };
}

export const isStrongSecurityAnswer = (val, qText = "") => validateSecurityAnswer(val, qText).valid;

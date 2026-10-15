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

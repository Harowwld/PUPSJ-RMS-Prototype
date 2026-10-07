import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(1, "Username is required").trim(),
  password: z.string().min(1, "Password is required"),
});

export const ForgotPasswordIdentifySchema = z.object({
  identifier: z.string().min(1, "Email or Staff ID is required").trim(),
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

export const UpdateProfileSchema = z.object({
  fname: z.string().min(1, "First name is required").trim(),
  lname: z.string().min(1, "Last name is required").trim(),
  email: z.string().email("Invalid email address").trim(),
});

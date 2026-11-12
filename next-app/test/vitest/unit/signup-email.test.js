import { expect, it, vi } from "vitest";
import nodemailer from "nodemailer";
import { sendStudentSignupCode } from "../../../src/lib/accountEmail.js";

vi.mock("nodemailer", () => ({ default: { createTransport: vi.fn() } }));

it("composes a branded verification email with a plain-text alternative and an inline logo", async () => {
  const actual = await vi.importActual("nodemailer");
  const stream = actual.default.createTransport({ streamTransport: true, buffer: true });
  let message;
  let html;
  nodemailer.createTransport.mockReturnValue({
    async sendMail(options) {
      html = options.html;
      const result = await stream.sendMail(options);
      message = result.message.toString("utf8");
      return { accepted: [options.to.address] };
    },
  });
  vi.stubEnv("SMTP_HOST", "smtp.example.com");
  vi.stubEnv("SMTP_FROM", "eManage <no-reply@example.com>");
  vi.stubEnv("SMTP_USER", "");
  vi.stubEnv("SMTP_PASSWORD", "");

  await sendStudentSignupCode({ to: "student@example.com", code: "042816" });

  expect(message).toContain("Content-Type: multipart/alternative");
  expect(message).toContain("Content-Type: text/plain");
  expect(message).toContain("Content-Type: text/html");
  expect(message).toContain("Content-ID: <emanage-signup-logo@pupsj-rms>");
  expect(message).toContain("Content-Disposition: inline");
  expect(message).toContain("042816");
  expect(html).toContain("prefers-color-scheme: dark");
  const digits = Array.from(html.matchAll(/<td class="tile bg-tile digit"[^>]*>([0-9])<\/td>/g), ([, digit]) => digit);
  expect(digits.join("")).toBe("042816");
});

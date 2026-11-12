import { afterEach, expect, it, vi } from "vitest";
import nodemailer from "nodemailer";
import { sendAccountCredentialsEmail, sendStudentSignupCode } from "../../../src/lib/accountEmail.js";

vi.mock("nodemailer", () => ({ default: { createTransport: vi.fn() } }));
afterEach(() => vi.unstubAllEnvs());

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
  expect(message).toContain("From: PUP eManage <no-reply@example.com>");
  expect(html).toContain(">PUP eManage</td>");
  expect(html).toContain("prefers-color-scheme: dark");
  const digits = Array.from(html.matchAll(/<td class="tile bg-tile digit"[^>]*>([0-9])<\/td>/g), ([, digit]) => digit);
  expect(digits.join("")).toBe("042816");
});

it("renders the account-ready template with credential rows, code tiles, and a security notice", async () => {
  vi.stubEnv("SMTP_HOST", "smtp.credentials.example.com");
  vi.stubEnv("SMTP_FROM", "PUPSJ RMS <no-reply@example.com>");
  vi.stubEnv("SMTP_USER", "");
  vi.stubEnv("SMTP_PASSWORD", "");
  vi.stubEnv("APP_URL", "https://portal.example.com/login");
  const sendMail = vi.fn().mockResolvedValue({ accepted: ["staff@example.com"] });
  nodemailer.createTransport.mockReturnValue({ sendMail });

  await sendAccountCredentialsEmail({
    to: "staff@example.com",
    username: "staff@example.com",
    fullName: "A & B",
    accountId: "STAFF-001",
    requiresActivation: true,
    password: "Temporary<&123",
    verificationCode: "042816",
  });

  const [message] = sendMail.mock.calls[0];
  expect(message.from).toEqual({ name: "PUP eManage", address: "no-reply@example.com" });
  expect(message.subject).toBe("Your eManage account sign-in details");
  expect(message.html).toContain("<title>Your eManage account is ready</title>");
  expect(message.html).toContain("Your account<br>is ready");
  expect(message.html).toContain("prefers-color-scheme: dark");
  expect(message.html).toContain("A &amp; B");
  expect(message.html).toContain('class="bg-inset"');
  expect(message.html.match(/class="divider"/g)).toHaveLength(2);
  expect(message.html).toContain("Temporary&lt;&amp;123");
  const digits = Array.from(message.html.matchAll(/<td class="tile bg-tile digit"[^>]*>([0-9])<\/td>/g), ([, digit]) => digit);
  expect(digits.join("")).toBe("042816");
  expect(message.html).toContain("Keep this private.");
  expect(message.html).toContain("An administrator must activate this account");
  expect(message.html).toContain("https://portal.example.com/login");
  expect(message.text).toContain("An administrator must activate this account");
  expect(message.attachments).toHaveLength(1);
});

it("omits unavailable sign-in details and uses the institution's sign-in instructions", async () => {
  vi.stubEnv("SMTP_HOST", "smtp.minimal.example.com");
  vi.stubEnv("SMTP_FROM", "no-reply@example.com");
  vi.stubEnv("SMTP_USER", "");
  vi.stubEnv("SMTP_PASSWORD", "");
  vi.stubEnv("APP_URL", "http://localhost:3000");
  const sendMail = vi.fn().mockResolvedValue({ accepted: ["staff@example.com"] });
  nodemailer.createTransport.mockReturnValue({ sendMail });

  await sendAccountCredentialsEmail({ to: "staff@example.com", username: "staff@example.com" });

  const [{ html, text }] = sendMail.mock.calls[0];
  expect(html).toContain("Open the eManage sign-in page provided by your institution.");
  expect(html).toContain("Use the password you chose during registration.");
  expect(html).not.toMatch(/Account ID|Temporary password|Email verification code|class="divider"/);
  expect(text).not.toContain("Email verification code");
});

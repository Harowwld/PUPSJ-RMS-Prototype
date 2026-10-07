import nodemailer from "nodemailer";

let transporter;
let transporterConfigKey;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function getTransporter() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const from = String(process.env.SMTP_FROM || "").trim();
  if (!host || !from) {
    const error = new Error("SMTP_HOST and SMTP_FROM must be configured to send account emails.");
    error.code = "MAIL_NOT_CONFIGURED";
    throw error;
  }

  const user = String(process.env.SMTP_USER || "").trim();
  const password = String(process.env.SMTP_PASSWORD || "");
  if (Boolean(user) !== Boolean(password)) {
    const error = new Error("SMTP_USER and SMTP_PASSWORD must both be configured, or both be empty.");
    error.code = "MAIL_INVALID_CONFIGURATION";
    throw error;
  }

  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    const error = new Error("SMTP_PORT must be a valid TCP port.");
    error.code = "MAIL_INVALID_CONFIGURATION";
    throw error;
  }

  const secureValue = process.env.SMTP_SECURE;
  const secure = secureValue === undefined ? port === 465 : /^(1|true|yes)$/i.test(secureValue);
  const configKey = JSON.stringify({ host, port, secure, user, password });
  if (transporter && transporterConfigKey === configKey) {
    return { transporter, from };
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    ...(user ? { auth: { user, pass: password } } : {}),
  });
  transporterConfigKey = configKey;

  return { transporter, from };
}

export function assertAccountEmailConfigured() {
  getTransporter();
}

export async function sendSmtpTestEmail({ to }) {
  const recipient = String(to || "").trim();
  if (recipient.length > 254 || !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(recipient)) {
    const error = new Error("Enter one valid recipient email address.");
    error.code = "MAIL_INVALID_RECIPIENT";
    throw error;
  }
  const mailer = getTransporter();
  const result = await mailer.transporter.sendMail({
    from: mailer.from,
    to: recipient,
    subject: "PUPSJ-RMS test email",
    text: "This is a test email from PUPSJ-RMS email setup. Receiving it confirms that this mailbox can receive messages from the configured SMTP server.",
  });
  if (!result.accepted?.length || result.rejected?.length) {
    const error = new Error("The SMTP server did not accept the test recipient.");
    error.code = "MAIL_RECIPIENT_REJECTED";
    throw error;
  }
  return { messageId: result.messageId };
}

export async function sendPasswordResetEmail({ to, fullName, resetUrl }) {
  const recipient = String(to || "").trim();
  if (!recipient || !resetUrl) throw new Error("A recipient and reset link are required.");
  const mailer = getTransporter();
  const name = String(fullName || "there").trim() || "there";
  const result = await mailer.transporter.sendMail({
    from: mailer.from,
    to: recipient,
    subject: "Reset your eManage password",
    text: [
      `Hello ${name},`,
      "",
      "Reset your password using this link:",
      resetUrl,
      "",
      "This link expires in 15 minutes and can be used once. Do not share it.",
      "If you did not request this reset, you can ignore this email. Your password has not changed.",
    ].join("\n"),
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
      <p>Hello ${escapeHtml(name)},</p>
      <p>Choose a new password for your eManage account.</p>
      <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 24px;background:#800000;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600">Reset Password</a></p>
      <p>If the button does not open, <a href="${escapeHtml(resetUrl)}">open the password reset page</a>.</p>
      <p>This link expires in 15 minutes and can be used once. Do not share it.</p>
      <p>If you did not request this reset, you can ignore this email. Your password has not changed.</p>
    </body></html>`,
  });
  if (!result.accepted?.length) throw new Error("Password reset email was not accepted.");
  return { messageId: result.messageId };
}

export async function sendAccountCredentialsEmail({
  to,
  fullName,
  accountType,
  accountId,
  requiresActivation = false,
  username,
  password,
}) {
  const recipient = String(to || "").trim();
  if (!recipient) throw new Error("A recipient email address is required.");
  if (!username) throw new Error("Account username is required.");

  const mailer = getTransporter();
  const name = String(fullName || "there").trim() || "there";
  const type = String(accountType || "account").trim() || "account";
  const configuredLoginUrl = String(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim();
  let loginUrl = "";
  try {
    const parsedLoginUrl = new URL(configuredLoginUrl);
    if (["http:", "https:"].includes(parsedLoginUrl.protocol) && !["localhost", "127.0.0.1", "::1"].includes(parsedLoginUrl.hostname)) {
      loginUrl = parsedLoginUrl.toString().replace(/\/$/, "");
    }
  } catch {
    // Do not put an invalid or local-only link in an account email.
  }
  const signInText = loginUrl
    ? `Open the eManage sign-in page: ${loginUrl}`
    : "Open the eManage sign-in page provided by your institution.";
  const passwordText = password
    ? `Password: ${password}`
    : "Use the password you chose during registration.";
  const securityText = password
    ? "For your security, change this password after signing in and do not share it."
    : "For your security, do not share your password.";
  const subject = "Your eManage account sign-in details";
  const text = [
    `Hello ${name},`,
    "",
    `An ${type} was created for you. Keep these sign-in details private:`,
    ...(requiresActivation ? ["An administrator must activate this account before you can sign in."] : []),
    ...(accountId ? [`Account ID: ${accountId}`] : []),
    `Username: ${username}`,
    passwordText,
    signInText,
    "",
    securityText,
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
    <p>Hello ${escapeHtml(name)},</p>
    <p>Your ${escapeHtml(type)} has been created. Use this account information to sign in:</p>
    ${requiresActivation ? "<p>An administrator must activate this account before you can sign in.</p>" : ""}
    ${accountId ? `<p><strong>Account ID:</strong> ${escapeHtml(accountId)}</p>` : ""}
    <p><strong>Username:</strong> ${escapeHtml(username)}${password ? `<br><strong>Password:</strong> ${escapeHtml(password)}` : ""}</p>
    ${password ? "" : "<p>Use the password you chose during registration.</p>"}
    ${loginUrl ? `<p><a href="${escapeHtml(loginUrl)}">Open the eManage sign-in page</a></p>` : "<p>Open the eManage sign-in page provided by your institution.</p>"}
    <p>${securityText}</p>
  </body></html>`;

  const result = await mailer.transporter.sendMail({
    from: mailer.from,
    to: recipient,
    subject,
    text,
    html,
  });
  return { messageId: result.messageId };
}

export async function sendAccountCredentialsNotice(details) {
  try {
    const result = await sendAccountCredentialsEmail(details);
    return { sent: true, messageId: result.messageId };
  } catch (error) {
    console.error("Account credential email could not be sent:", error?.message || error);
    return {
      sent: false,
      reason: error?.code === "MAIL_NOT_CONFIGURED" ? "not_configured" : "delivery_failed",
    };
  }
}

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
  const loginUrl = String(
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000")
  ).trim();
  const signInText = loginUrl ? `Sign in: ${loginUrl}` : "Use your institution's PUPSJ RMS sign-in page.";
  const passwordText = password
    ? `Password: ${password}`
    : "Use the password you chose during registration.";
  const securityText = password
    ? "For your security, change this password after signing in and do not share it."
    : "For your security, do not share your password.";
  const subject = "Your PUPSJ Records Management System account";
  const text = [
    `Hello ${name},`,
    "",
    `Your ${type} has been created. Use this account information to sign in:`,
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
    ${loginUrl ? `<p><a href="${escapeHtml(loginUrl)}">Sign in to PUPSJ RMS</a></p>` : "<p>Use your institution's PUPSJ RMS sign-in page.</p>"}
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

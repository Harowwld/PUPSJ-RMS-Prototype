import nodemailer from "nodemailer";
import { join } from "node:path";

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

export async function sendStudentSignupCode({ to, code }) {
  const mailer = getTransporter();
  const logoCid = "emanage-signup-logo@pupsj-rms";
  const result = await mailer.transporter.sendMail({
    from: mailer.from,
    to: { name: "", address: to },
    subject: "Verify your eManage email address",
    text: [
      "Verify your email address",
      "",
      "Enter this code in eManage to continue setting up your account:",
      "",
      String(code),
      "",
      "This code expires in 10 minutes. If you didn’t start signing up, you can ignore this email.",
    ].join("\n"),
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Verify your eManage email address</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    @media (prefers-color-scheme: dark) {
      .bg-page  { background-color: #000000 !important; }
      .bg-panel { background-color: #1c1c1e !important; }
      .bg-tile  { background-color: #2c2c2e !important; }
      .bg-note  { background-color: #2c2c2e !important; }
      .text-pri { color: #f5f5f7 !important; }
      .text-sec { color: #98989d !important; }
      .digit    { color: #ff8a8a !important; }
    }
    @media only screen and (max-width: 520px) {
      .panel-pad { padding: 28px 24px 32px !important; }
      .headline  { font-size: 30px !important; }
      .tile      { width: 42px !important; height: 54px !important; font-size: 26px !important; line-height: 54px !important; }
    }
    @media only screen and (max-width: 375px) {
      .panel-pad { padding-left: 16px !important; padding-right: 16px !important; }
      .tile      { width: 34px !important; height: 48px !important; line-height: 48px !important; }
    }
  </style>
</head>
<body class="bg-page" style="margin:0;padding:0;background-color:#f5f5f7;-webkit-text-size-adjust:100%;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Helvetica,Arial,sans-serif;color:#1d1d1f">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#f5f5f7">Your eManage verification code. It expires in 10 minutes.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" bgcolor="#f5f5f7">
    <tr>
      <td align="center" style="padding:32px 12px 40px">
        <!--[if mso]><table role="presentation" width="520" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">

          <!-- Header -->
          <tr>
            <td style="padding:0 8px 20px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:10px"><img src="cid:${logoCid}" alt="" width="32" height="32" style="display:block;width:32px;height:32px;border:0;border-radius:8px;background-color:#ffffff"></td>
                  <td class="text-pri" style="color:#1d1d1f;font-size:17px;font-weight:600;letter-spacing:-0.2px">eManage</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main panel -->
          <tr>
            <td class="bg-panel panel-pad" bgcolor="#ffffff" style="background-color:#ffffff;border-radius:24px;padding:40px" align="left">
              <h1 class="headline text-pri" style="margin:0;color:#1d1d1f;font-size:34px;line-height:1.1;font-weight:700;letter-spacing:-0.8px;text-align:left">Verify your<br>email address</h1>
              <p class="text-sec" style="margin:14px 0 0;color:#6e6e73;font-size:17px;line-height:1.47;letter-spacing:-0.2px;text-align:left">Enter this code in eManage to continue setting up your account.</p>

              <!-- Code tiles -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left" style="margin:32px 0 0;border-collapse:separate;border-spacing:8px 0;margin-left:-8px">
                <tr>
                  ${[...String(code)].map((digit) => `<td class="tile bg-tile digit" align="center" bgcolor="#faf0f0" width="48" height="60" style="width:48px;height:60px;background-color:#faf0f0;border-radius:14px;color:#800000;font-family:ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace;font-size:30px;font-weight:600;line-height:60px;text-align:center">${escapeHtml(digit)}</td>`).join("")}
                </tr>
              </table>
              <div style="clear:both;font-size:0;line-height:0;height:0">&nbsp;</div>

              <!-- Expiry note -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">
                <tr>
                  <td class="bg-note text-sec" bgcolor="#f5f5f7" style="background-color:#f5f5f7;border-radius:12px;padding:12px 16px;color:#6e6e73;font-size:14px;line-height:1.4;text-align:left">This code expires in <strong class="text-pri" style="color:#1d1d1f;font-weight:600">10 minutes</strong>.</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="text-sec" style="padding:20px 8px 0;color:#6e6e73;font-size:13px;line-height:1.5;text-align:left">
              If you didn’t start signing up, you can safely ignore this email. Someone may have entered your address by mistake.
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`,
    attachments: [{
      filename: "emanage-logo.png",
      path: join(process.cwd(), "public", "assets", "branding", "black-icon.png"),
      contentType: "image/png",
      cid: logoCid,
    }],
  });
  if (!result.accepted?.length) throw new Error("Signup verification email was not accepted.");
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
    html: `<!doctype html><html><body style="font-family:'Plus Jakarta Sans',sans-serif;color:#1f2937;line-height:1.5">
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
  const html = `<!doctype html><html><body style="font-family:'Plus Jakarta Sans',sans-serif;color:#1f2937;line-height:1.5">
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

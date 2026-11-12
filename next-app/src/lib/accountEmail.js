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

const ACCOUNT_EMAIL_BRAND = "PUP eManage";

function brandedAccountSender(from) {
  const address = from.match(/<([^<>]+)>$/)?.[1] ?? from;
  return { name: ACCOUNT_EMAIL_BRAND, address };
}

function renderAccountEmail({ title, preview, headline, content, footer }) {
  const logoCid = "emanage-signup-logo@pupsj-rms";
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    @media (prefers-color-scheme: dark) {
      .bg-page  { background-color: #000000 !important; }
      .bg-panel { background-color: #1c1c1e !important; }
      .bg-tile  { background-color: #2c2c2e !important; }
      .bg-note, .bg-inset { background-color: #2c2c2e !important; }
      .divider  { border-top-color: #3a3a3c !important; }
      .warn     { background-color: #2a1d1d !important; border-color: #4a2a2a !important; color: #ffb4b4 !important; }
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
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#f5f5f7">${escapeHtml(preview)}</div>

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
                  <td class="text-pri" style="color:#1d1d1f;font-size:17px;font-weight:600;letter-spacing:-0.2px">${ACCOUNT_EMAIL_BRAND}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main panel -->
          <tr>
            <td class="bg-panel panel-pad" bgcolor="#ffffff" style="background-color:#ffffff;border-radius:24px;padding:40px" align="left">
              <h1 class="headline text-pri" style="margin:0;color:#1d1d1f;font-size:34px;line-height:1.1;font-weight:700;letter-spacing:-0.8px;text-align:left">${headline}</h1>
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="text-sec" style="padding:20px 8px 0;color:#6e6e73;font-size:13px;line-height:1.5;text-align:left">
              ${escapeHtml(footer)}
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
  return {
    html,
    attachments: [{
      filename: "emanage-logo.png",
      path: join(process.cwd(), "public", "assets", "branding", "black-icon.png"),
      contentType: "image/png",
      cid: logoCid,
    }],
  };
}

function renderVerificationDigits(code) {
  return [...String(code)].map((digit) => `<td class="tile bg-tile digit" align="center" bgcolor="#faf0f0" width="48" height="60" style="width:48px;height:60px;background-color:#faf0f0;border-radius:14px;color:#800000;font-family:ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace;font-size:30px;font-weight:600;line-height:60px;text-align:center">${escapeHtml(digit)}</td>`).join("");
}

export async function sendEmailVerificationCode({ to, code, staff = false }) {
  const instructions = staff
    ? "Enter this code after signing in with your staff email and password."
    : "Enter this code in eManage to continue setting up your account.";
  const ignore = staff
    ? "If you weren’t expecting a staff account, contact your administrator."
    : "If you didn’t start signing up, you can ignore this email.";
  const mailer = getTransporter();
  const subject = "Verify your eManage email address";
  const result = await mailer.transporter.sendMail({
    from: brandedAccountSender(mailer.from),
    to: { name: "", address: to },
    subject,
    text: [
      "Verify your email address",
      "",
      instructions,
      "",
      String(code),
      "",
      `This code expires in 10 minutes. ${ignore}`,
    ].join("\n"),
    ...renderAccountEmail({
      title: subject,
      preview: "Your PUP eManage verification code. It expires in 10 minutes.",
      headline: "Verify your<br>email address",
      content: `
              <p class="text-sec" style="margin:14px 0 0;color:#6e6e73;font-size:17px;line-height:1.47;letter-spacing:-0.2px;text-align:left">${instructions}</p>

              <!-- Code tiles -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left" style="margin:32px 0 0;border-collapse:separate;border-spacing:8px 0;margin-left:-8px">
                <tr>
                  ${renderVerificationDigits(code)}
                </tr>
              </table>
              <div style="clear:both;font-size:0;line-height:0;height:0">&nbsp;</div>

              <!-- Expiry note -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">
                <tr>
                  <td class="bg-note text-sec" bgcolor="#f5f5f7" style="background-color:#f5f5f7;border-radius:12px;padding:12px 16px;color:#6e6e73;font-size:14px;line-height:1.4;text-align:left">This code expires in <strong class="text-pri" style="color:#1d1d1f;font-weight:600">10 minutes</strong>.</td>
                </tr>
              </table>`,
      footer: ignore,
    }),
  });
  if (!result.accepted?.length) throw new Error("Signup verification email was not accepted.");
}

export const sendStudentSignupCode = sendEmailVerificationCode;

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
  verificationCode,
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
    ? `Temporary password: ${password}`
    : "Use the password you chose during registration.";
  const securityText = password
    ? "For your security, change this password after signing in and do not share it."
    : "For your security, do not share your password.";
  const subject = "Your eManage account sign-in details";
  const footer = "You’re receiving this because an administrator created an eManage account for this email address. If you weren’t expecting it, you can ignore this email.";
  const text = [
    `Hello ${name},`,
    "",
    `Your ${type} has been created. Keep these sign-in details private.`,
    ...(requiresActivation ? ["An administrator must activate this account before you can sign in."] : []),
    ...(accountId ? [`Account ID: ${accountId}`] : []),
    `Username: ${username}`,
    passwordText,
    ...(verificationCode ? [`Email verification code: ${verificationCode} (expires in 10 minutes). Enter it at first sign-in.`] : []),
    signInText,
    "",
    securityText,
    "",
    footer,
  ].join("\n");
  const details = [
    ...(accountId ? [["Account ID", accountId]] : []),
    ["Username", username],
    ...(password ? [["Temporary password", password]] : []),
  ];
  const result = await mailer.transporter.sendMail({
    from: brandedAccountSender(mailer.from),
    to: recipient,
    subject,
    text,
    ...renderAccountEmail({
      title: "Your eManage account is ready",
      preview: verificationCode
        ? "Your eManage account has been created. Your sign-in details and verification code are inside."
        : "Your eManage account has been created. Your sign-in details are inside.",
      headline: "Your account<br>is ready",
      content: `
              <p class="text-sec" style="margin:14px 0 0;color:#6e6e73;font-size:17px;line-height:1.47;letter-spacing:-0.2px;text-align:left">Hello ${escapeHtml(name)}, your ${escapeHtml(type)} has been created. Use the details below to sign in.</p>
              ${requiresActivation ? '<p class="text-sec" style="margin:14px 0 0;color:#6e6e73;font-size:14px;line-height:1.5;text-align:left">An administrator must activate this account before you can sign in.</p>' : ""}

              <!-- Credentials -->
              <p class="text-sec" style="margin:32px 0 10px;color:#6e6e73;font-size:13px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;text-align:left">Sign-in details</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-inset" bgcolor="#f5f5f7" style="background-color:#f5f5f7;border-radius:16px">
                ${details.map(([label, value], index) => `
                  ${index ? `<tr>
                    <td style="padding:0 18px"><div class="divider" style="border-top:1px solid #e0e0e5;font-size:0;line-height:0;height:0">&nbsp;</div></td>
                  </tr>` : ""}
                  <tr>
                    <td style="padding:${index ? 14 : 16}px 18px ${index === details.length - 1 ? 16 : 14}px;text-align:left">
                      <div class="text-sec" style="color:#6e6e73;font-size:12px;line-height:1.3">${label}</div>
                      <div class="text-pri" style="margin-top:3px;color:#1d1d1f;${label === "Temporary password" ? "font-family:ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace;font-size:15px;line-height:1.4" : "font-size:16px;line-height:1.35"};font-weight:600;word-break:break-all">${escapeHtml(value)}</div>
                    </td>
                  </tr>`).join("")}
              </table>

              ${password ? "" : `<p class="text-sec" style="margin:14px 0 0;color:#6e6e73;font-size:14px;line-height:1.5;text-align:left">${passwordText}</p>`}
              <p class="text-sec" style="margin:14px 0 0;color:#6e6e73;font-size:14px;line-height:1.5;text-align:left">${loginUrl ? `Open the <a href="${escapeHtml(loginUrl)}" class="text-pri" style="color:#1d1d1f;font-weight:600">eManage sign-in page</a>.` : signInText}</p>

              ${verificationCode ? `
                <!-- Verification code -->
                <p class="text-sec" style="margin:32px 0 10px;color:#6e6e73;font-size:13px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;text-align:left">Email verification code</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left" style="border-collapse:separate;border-spacing:8px 0;margin-left:-8px">
                  <tr>${renderVerificationDigits(verificationCode)}</tr>
                </table>
                <div style="clear:both;font-size:0;line-height:0;height:0">&nbsp;</div>
                <p class="text-sec" style="margin:14px 0 0;color:#6e6e73;font-size:14px;line-height:1.5;text-align:left">Enter this code at first sign-in. It expires in <strong class="text-pri" style="color:#1d1d1f;font-weight:600">10 minutes</strong>.</p>` : ""}

              <!-- Security notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px">
                <tr>
                  <td class="warn" bgcolor="#faf0f0" style="background-color:#faf0f0;border:1px solid #f0dcdc;border-radius:14px;padding:14px 16px;color:#800000;font-size:14px;line-height:1.45;text-align:left">
                    <strong style="font-weight:600">Keep this private.</strong> ${password ? "Change your password after signing in and don’t share it with anyone." : "Don’t share your password with anyone."}
                  </td>
                </tr>
              </table>`,
      footer,
    }),
  });
  if (!result.accepted?.length) throw new Error("Account credentials email was not accepted.");
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

import { sendSmtpTestEmail } from "../src/lib/accountEmail.js";

const messages = {
  MAIL_NOT_CONFIGURED: "Configure the SMTP host and sender address first.",
  MAIL_INVALID_CONFIGURATION: "Check the SMTP port, username, and password settings.",
  MAIL_INVALID_RECIPIENT: "Enter one valid recipient email address.",
  MAIL_RECIPIENT_REJECTED: "The SMTP server rejected the test recipient. Check the recipient and sender addresses.",
  EAUTH: "SMTP authentication failed. Check the username and password or provider app password.",
  ECONNECTION: "Could not connect to the SMTP server. Check the host, port, and encryption setting.",
  ECONNREFUSED: "The SMTP connection was refused. Check the host and port.",
  ETIMEDOUT: "The SMTP connection timed out. Check connectivity and firewall settings.",
  EDNS: "The SMTP host could not be resolved. Check the host name.",
  ESOCKET: "The SMTP connection failed. Check connectivity and encryption settings.",
  EENVELOPE: "The SMTP server rejected the sender or recipient address.",
  EMESSAGE: "The SMTP server rejected the test message.",
};

try {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 4096) throw new SyntaxError("Input too long");
  }
  const data = JSON.parse(input.replace(/^\uFEFF/, ""));
  await sendSmtpTestEmail({ to: data?.to });
  console.log("SMTP server accepted the test email. Check the recipient's Inbox and Spam folders to confirm delivery.");
} catch (error) {
  const message = error instanceof SyntaxError
    ? "Provide a JSON object with a single recipient in the to field through standard input."
    : messages[error?.code] || "Test email failed. Check SMTP configuration and provider settings.";
  console.error(message);
  process.exitCode = 1;
}

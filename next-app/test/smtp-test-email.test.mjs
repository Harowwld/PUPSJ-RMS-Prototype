import assert from "node:assert/strict";
import net from "node:net";
import { spawn } from "node:child_process";
import test from "node:test";
import nodemailer from "nodemailer";
import { sendSmtpTestEmail } from "../src/lib/accountEmail.js";

const cli = new URL("../scripts/test-smtp.mjs", import.meta.url);
const mailEnv = {
  SMTP_HOST: "127.0.0.1", SMTP_PORT: "587", SMTP_SECURE: "false",
  SMTP_FROM: "installer@example.test", SMTP_USER: "", SMTP_PASSWORD: "",
};

function runCli(input, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli.pathname], {
      env: { ...process.env, ...mailEnv, ...env }, stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "", stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

test("installer test validates recipients, excludes secrets, and rejects partial SMTP acceptance", async () => {
  const originalEnv = { ...process.env };
  const originalCreateTransport = nodemailer.createTransport;
  const messages = [];
  let response = { accepted: ["recipient@example.test"], rejected: [], messageId: "test" };
  Object.assign(process.env, mailEnv);
  nodemailer.createTransport = () => ({ sendMail: async (message) => { messages.push(message); return response; } });
  try {
    for (const to of ["", "recipient", "a@example.test,b@example.test", "a@example.test\r\nBcc: secret@example.test"]) {
      await assert.rejects(sendSmtpTestEmail({ to }), { code: "MAIL_INVALID_RECIPIENT" });
    }
    assert.equal(messages.length, 0);
    await sendSmtpTestEmail({ to: "recipient@example.test" });
    assert.equal(messages[0].subject, "PUPSJ-RMS test email");
    assert.equal(messages[0].from, mailEnv.SMTP_FROM);
    assert.equal(messages[0].to, "recipient@example.test");
    assert.equal(/password|token|credentials/i.test(messages[0].text), false);
    response = { accepted: [], rejected: ["recipient@example.test"] };
    await assert.rejects(sendSmtpTestEmail({ to: "recipient@example.test" }), { code: "MAIL_RECIPIENT_REJECTED" });
    response = { accepted: ["recipient@example.test"], rejected: ["recipient@example.test"] };
    await assert.rejects(sendSmtpTestEmail({ to: "recipient@example.test" }), { code: "MAIL_RECIPIENT_REJECTED" });
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
});

test("CLI reports invalid input and missing configuration without dumping input or secrets", async () => {
  const invalid = await runCli('{"to":"not-an-email"}');
  assert.equal(invalid.code, 1);
  assert.match(invalid.stderr, /valid recipient/);
  const missing = await runCli('{"to":"recipient@example.test"}', { SMTP_HOST: "", SMTP_PASSWORD: "private-password" });
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /Configure the SMTP host/);
  assert.equal(missing.stderr.includes("private-password"), false);
  const malformed = await runCli("private-password");
  assert.equal(malformed.code, 1);
  assert.equal(malformed.stderr.includes("private-password"), false);
});

test("CLI sends to a local SMTP capture and distinguishes acceptance from inbox delivery", async () => {
  const captured = [];
  const server = net.createServer((socket) => {
    socket.write("220 local SMTP test\r\n");
    let buffer = "", inData = false, message = "";
    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      while (buffer.includes("\r\n")) {
        const end = buffer.indexOf("\r\n");
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (inData) {
          if (line === ".") { captured.push(message); inData = false; socket.write("250 queued\r\n"); }
          else message += line + "\r\n";
        } else if (line.startsWith("DATA")) { inData = true; socket.write("354 send data\r\n"); }
        else if (line.startsWith("QUIT")) socket.end("221 bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const result = await runCli('{"to":"recipient@example.test"}', { SMTP_PORT: String(server.address().port) });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /accepted/);
    assert.match(result.stdout, /confirm delivery/);
    assert.equal(captured.length, 1);
    assert.match(captured[0], /Subject: PUPSJ-RMS test email/);
    assert.match(captured[0], /To: recipient@example.test/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

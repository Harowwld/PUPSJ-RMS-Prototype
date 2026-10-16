import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

export function getAppleVisionSocketPath() {
  const workspaceId = createHash("sha256").update(process.cwd()).digest("hex").slice(0, 16);
  const uid = typeof process.getuid === "function" ? process.getuid() : process.pid;
  return path.join(os.tmpdir(), `pupsj-ocr-${uid}-${workspaceId}.sock`);
}

export function getWindowsOcrEndpoint() {
  const host = process.env.PUPSJ_OCR_HOST;
  const port = Number(process.env.PUPSJ_OCR_PORT);
  const token = process.env.PUPSJ_OCR_TOKEN;
  if (!host || !Number.isInteger(port) || port < 1 || !token) {
    throw new Error("Windows OCR worker endpoint is unavailable; start RMS through its launcher.");
  }
  return { host, port, token };
}

export function requestAppleVisionOcr(filePath, {
  attempts = 1,
  socketPath = getAppleVisionSocketPath(),
  endpoint = null,
} = {}) {
  return new Promise((resolve, reject) => {
    const connection = endpoint || (os.platform() === "win32" ? getWindowsOcrEndpoint() : null);
    const socket = connection
      ? net.createConnection({ host: connection.host, port: connection.port })
      : net.createConnection(socketPath);
    socket.setEncoding("utf8");
    let response = "";
    let settled = false;

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(result);
    };

    socket.once("connect", () => {
      socket.write(`${JSON.stringify({
        filePath: path.resolve(filePath),
        attempts,
        ...(connection ? { token: connection.token } : {}),
      })}\n`);
    });
    socket.on("data", (chunk) => {
      response += chunk;
      if (response.length > 20 * 1024 * 1024) return finish(new Error("OCR response exceeds 20 MB"));
      const end = response.indexOf("\n");
      if (end < 0) return;
      try {
        const reply = JSON.parse(response.slice(0, end));
        finish(reply.error ? new Error(reply.error) : null, reply.result);
      } catch (error) {
        finish(error);
      }
    });
    socket.once("error", (error) => finish(new Error(`OCR service is unavailable: ${error.message}`)));
    socket.once("close", () => finish(new Error("OCR service closed before returning a result")));
  });
}

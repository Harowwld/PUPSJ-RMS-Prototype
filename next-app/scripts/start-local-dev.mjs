import { spawn, spawnSync } from "node:child_process";
import process from "node:process";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(command, args, label) {
  const result = spawnSync(command, args, { stdio: "inherit", cwd: process.cwd() });
  if (result.error) {
    throw new Error(`${label} failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} exited with code ${result.status}`);
  }
}

try {
  console.log("[dev] Starting local PostgreSQL with Docker Compose...");
  run("docker", ["compose", "up", "-d", "--wait", "postgres"], "Docker Compose");
  console.log("[dev] PostgreSQL is ready. Running migrations...");
  run(pnpmCommand, ["db:migrate"], "Database migrations");
  console.log("[dev] Starting Next.js and the hot-folder watcher...");

  const devCommands = ["next dev"];
  if (process.env.HOT_FOLDER_INGEST_TOKEN) {
    devCommands.push("wait-on tcp:3000 && node scripts/hot-folder-watcher/watch.mjs");
  } else {
    console.warn("[dev] HOT_FOLDER_INGEST_TOKEN is not set; hot-folder watcher is disabled.");
  }

  const dev = spawn(
    pnpmCommand,
    ["exec", "concurrently", "-n", devCommands.length === 2 ? "next,hot-folder" : "next", "-c", "cyan,magenta", ...devCommands],
    { stdio: "inherit", cwd: process.cwd(), shell: false }
  );

  const stop = (signal) => {
    if (!dev.killed) dev.kill(signal);
  };
  process.on("SIGINT", () => stop("SIGINT"));
  process.on("SIGTERM", () => stop("SIGTERM"));
  dev.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
} catch (error) {
  console.error(`[dev] ${error.message}`);
  console.error("[dev] Make sure Docker Desktop is running and try pnpm dev again.");
  process.exit(1);
}

import { spawn, spawnSync } from "node:child_process";
import process from "node:process";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const isWindows = process.platform === "win32";
const pnpmCommand = isWindows ? "pnpm.cmd" : "pnpm";
const port = Number(process.env.PORT || 3000);
process.env.HOT_FOLDER_API_URL ||= `http://localhost:${port}/api/ingest/hot-folder`;

try {
  const dockerStartup = spawnSync(pnpmCommand, ["exec", "node", "scripts/ensure-docker.mjs"], {
    stdio: "inherit", cwd: process.cwd(), shell: isWindows,
  });
  if (dockerStartup.error || dockerStartup.status !== 0) {
    throw new Error(`Docker Engine startup failed${dockerStartup.error ? `: ${dockerStartup.error.message}` : ` (exit ${dockerStartup.status})`}`);
  }
  console.log("[start] Starting local PostgreSQL with Docker Compose...");
  const docker = spawnSync("docker", ["compose", "up", "-d", "--wait", "postgres"], {
    stdio: "inherit", cwd: process.cwd(), shell: isWindows,
  });
  if (docker.error || docker.status !== 0) {
    throw new Error(`Docker Compose failed${docker.error ? `: ${docker.error.message}` : ` (exit ${docker.status})`}`);
  }
  console.log("[start] PostgreSQL is ready. Running migrations...");
} catch (error) {
  console.error(`[start] ${error.message}`);
  console.error("[start] Make sure Docker Desktop is running and try pnpm start again.");
  process.exit(1);
}

const migration = spawnSync(pnpmCommand, ["db:migrate"], {
  stdio: "inherit",
  cwd: process.cwd(),
  shell: isWindows,
});
if (migration.error || migration.status !== 0) {
  console.error(`[start] Database migrations failed${migration.error ? `: ${migration.error.message}` : ` (exit ${migration.status})`}`);
  process.exit(1);
}

const commands = ['"next start"'];
const names = ["next", "warmup"];
const colors = ["cyan", "yellow"];
commands.push(`"wait-on tcp:${port} && node scripts/warm-local-routes.mjs"`);

if (process.env.HOT_FOLDER_INGEST_TOKEN) {
  commands.push(`"wait-on tcp:${port} && node scripts/hot-folder-watcher/watch.mjs"`);
  names.push("hot-folder");
  colors.push("magenta");
} else {
  console.warn("[start] HOT_FOLDER_INGEST_TOKEN is not set; hot-folder watcher is disabled.");
}

const app = spawn(
  pnpmCommand,
  ["exec", "concurrently", "-n", names.join(","), "-c", colors.join(","), ...commands],
  { stdio: "inherit", cwd: process.cwd(), shell: isWindows }
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!app.killed) app.kill(signal);
  });
}

app.on("error", (error) => {
  console.error(`[start] Could not launch application processes: ${error.message}`);
  process.exitCode = 1;
});

app.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});

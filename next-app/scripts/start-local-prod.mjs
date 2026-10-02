import { spawn, spawnSync } from "node:child_process";
import process from "node:process";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const isWindows = process.platform === "win32";
const pnpmCommand = isWindows ? "pnpm.cmd" : "pnpm";
const port = Number(process.env.PORT || 3000);
process.env.HOT_FOLDER_API_URL ||= `http://localhost:${port}/api/ingest/hot-folder`;

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
const names = ["next"];
const colors = ["cyan"];

if (process.env.HOT_FOLDER_INGEST_TOKEN) {
  commands.push(`"wait-on tcp:${port} && node scripts/hot-folder-watcher/watch.mjs"`);
  names.push("hot-folder");
  colors.push("magenta");
} else {
  console.warn("[start] HOT_FOLDER_INGEST_TOKEN is not set; hot-folder watcher is disabled.");
}

const app = spawn(
  pnpmCommand,
  ["exec", "concurrently", "-k", "-n", names.join(","), "-c", colors.join(","), ...commands],
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

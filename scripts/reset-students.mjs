/**
 * Launcher: run from repo root so `node scripts/reset-students.mjs --confirm` works.
 * The real script lives in next-app/ and needs process.cwd() === next-app for .local data.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nextAppRoot = path.resolve(__dirname, "..", "next-app");
const scriptPath = path.join(nextAppRoot, "scripts", "reset-students.mjs");

const result = spawnSync(process.execPath, [scriptPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: nextAppRoot,
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);

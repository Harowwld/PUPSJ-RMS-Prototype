import { execFileSync } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

if (process.platform !== "linux" && process.platform !== "darwin") {
  console.error("[kill:port-3000] This command supports Linux and macOS.");
  process.exit(1);
}

const uid = typeof process.getuid === "function" ? process.getuid() : null;
let pids;

try {
  const output = execFileSync("lsof", ["-nP", "-t", "-iTCP:3000", "-sTCP:LISTEN"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  pids = [...new Set(output.trim().split(/\s+/).filter(Boolean).map(Number))];
} catch (error) {
  if (error.status === 1) {
    console.log("[kill:port-3000] Nothing is listening on port 3000.");
    process.exit(0);
  }
  console.error("[kill:port-3000] Could not inspect port 3000. Ensure lsof is installed.");
  process.exit(1);
}

function getProcess(pid) {
  try {
    const output = execFileSync("ps", ["-p", String(pid), "-o", "uid=,command="], { encoding: "utf8" }).trim();
    const match = output.match(/^(\d+)\s+(.+)$/);
    return match ? { uid: Number(match[1]), command: match[2] } : null;
  } catch {
    return null;
  }
}

const targets = pids
  .map((pid) => ({ pid, ...getProcess(pid) }))
  .filter((target) => target.command && target.uid === uid);
const skipped = pids.length - targets.length;

if (targets.length === 0) {
  console.log(skipped
    ? "[kill:port-3000] Port 3000 is occupied by a process owned by another user; no process was stopped."
    : "[kill:port-3000] Nothing is listening on port 3000.");
  process.exit(skipped ? 1 : 0);
}

for (const target of targets) {
  console.log(`[kill:port-3000] Stopping PID ${target.pid}: ${target.command}`);
  try {
    process.kill(target.pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") console.warn(`[kill:port-3000] Could not stop PID ${target.pid}: ${error.message}`);
  }
}

await delay(1500);
for (const target of targets) {
  const current = getProcess(target.pid);
  if (current?.uid !== uid || current.command !== target.command) continue;
  try {
    process.kill(target.pid, "SIGKILL");
  } catch (error) {
    if (error.code !== "ESRCH") console.warn(`[kill:port-3000] Could not force-stop PID ${target.pid}: ${error.message}`);
  }
}

console.log("[kill:port-3000] Finished stopping port 3000 listeners.");

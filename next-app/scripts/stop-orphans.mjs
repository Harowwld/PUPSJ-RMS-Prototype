import { execFileSync } from "node:child_process";
import { realpath, readlink } from "node:fs/promises";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { collectProcessTree, findOrphanedRmsLaunchers, parseProcessTable, RMS_LAUNCHER_MARKERS } from "./orphanProcesses.mjs";

if (!new Set(["darwin", "linux"]).has(process.platform)) {
  console.error("[stop:orphans] This command currently supports macOS and Linux.");
  process.exit(1);
}

const workspacePath = await realpath(process.cwd());
const uid = typeof process.getuid === "function" ? process.getuid() : -1;
const output = execFileSync("ps", ["-axo", "pid=,ppid=,uid=,command="], { encoding: "utf8" });
const processes = parseProcessTable(output);
const possibleLaunchers = processes.filter((entry) =>
  entry.uid === uid
  && entry.ppid === 1
  && RMS_LAUNCHER_MARKERS.some((marker) => entry.command.includes(marker))
);

async function getCwd(pid) {
  try {
    if (process.platform === "linux") return await readlink(`/proc/${pid}/cwd`);
    const details = execFileSync("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return details.split("\n").find((line) => line.startsWith("n"))?.slice(1) ?? null;
  } catch {
    return null;
  }
}

for (const entry of possibleLaunchers) entry.cwd = await getCwd(entry.pid);

const launchers = findOrphanedRmsLaunchers(possibleLaunchers, { uid, workspacePath });
if (launchers.length === 0) {
  console.log("[stop:orphans] No orphaned RMS server processes found.");
  process.exit(0);
}

const targets = launchers.flatMap(({ pid }) => collectProcessTree(processes, pid));
const uniqueTargets = [...new Map(targets.map((entry) => [entry.pid, entry])).values()];
console.log(`[stop:orphans] Stopping ${uniqueTargets.length} orphaned RMS process(es)...`);

function isSameProcess(target) {
  try {
    const current = parseProcessTable(execFileSync("ps", ["-p", String(target.pid), "-o", "pid=,ppid=,uid=,command="], { encoding: "utf8" }))[0];
    return current?.uid === uid && current.command === target.command;
  } catch {
    return false;
  }
}

for (const target of uniqueTargets) {
  if (!isSameProcess(target)) continue;
  try {
    process.kill(target.pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") console.warn(`[stop:orphans] Could not stop PID ${target.pid}: ${error.message}`);
  }
}

await delay(1500);
for (const target of uniqueTargets) {
  if (!isSameProcess(target)) continue;
  try {
    process.kill(target.pid, 0);
    process.kill(target.pid, "SIGKILL");
  } catch (error) {
    if (error.code !== "ESRCH") console.warn(`[stop:orphans] Could not force-stop PID ${target.pid}: ${error.message}`);
  }
}

console.log("[stop:orphans] Orphaned RMS processes stopped.");

import { execFileSync } from "node:child_process";
import net from "node:net";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

if (process.platform !== "linux" && process.platform !== "darwin") {
  console.error("[kill:port-3000] This command supports Linux and macOS.");
  process.exit(1);
}

function stopDockerPortContainers(port = 3000) {
  try {
    const output = execFileSync("docker", ["ps", "--filter", `publish=${port}`, "--format", "{{.ID}}\t{{.Names}}"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!output) return [];
    const containers = output
      .split("\n")
      .map((line) => {
        const [id, name] = line.split("\t");
        return { id: id?.trim(), name: name?.trim() || id?.trim() };
      })
      .filter((c) => c.id);

    for (const c of containers) {
      console.log(`[kill:port-3000] Stopping Docker container ${c.name} (${c.id}) publishing port ${port}...`);
      try {
        execFileSync("docker", ["stop", c.id], { stdio: "ignore" });
        console.log(`[kill:port-3000] Stopped Docker container ${c.name}.`);
      } catch (err) {
        console.warn(`[kill:port-3000] Could not stop Docker container ${c.name}: ${err.message}`);
      }
    }
    return containers;
  } catch {
    return [];
  }
}

function isPortBound(port = 3000) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (error) => {
      resolve(error.code === "EADDRINUSE");
    });
    server.listen({ port, host: "0.0.0.0", exclusive: true }, () => {
      server.close(() => resolve(false));
    });
  });
}

const stoppedContainers = stopDockerPortContainers(3000);

const uid = typeof process.getuid === "function" ? process.getuid() : null;
let pids = [];

try {
  const output = execFileSync("lsof", ["-nP", "-t", "-iTCP:3000", "-sTCP:LISTEN"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  pids = [...new Set(output.trim().split(/\s+/).filter(Boolean).map(Number))];
} catch (error) {
  if (error.status !== 1) {
    console.error("[kill:port-3000] Could not inspect port 3000 via lsof.");
  }
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
  const stillInUse = await isPortBound(3000);
  if (stoppedContainers.length > 0 && !stillInUse) {
    console.log("[kill:port-3000] Port 3000 freed after stopping Docker container(s).");
    process.exit(0);
  }
  if (stillInUse || skipped > 0) {
    console.error("[kill:port-3000] Port 3000 is occupied by a process owned by another user or container daemon. Try 'docker ps' or running with elevated privileges.");
    process.exit(1);
  }
  console.log("[kill:port-3000] Nothing is listening on port 3000.");
  process.exit(0);
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

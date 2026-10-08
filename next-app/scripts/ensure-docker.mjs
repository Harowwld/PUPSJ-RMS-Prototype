import { spawnSync } from "node:child_process";
import process from "node:process";

const isWindows = process.platform === "win32";

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: "inherit",
    cwd: process.cwd(),
    shell: isWindows,
    ...options,
  });
}

function dockerIsReady() {
  const result = run("docker", ["info"], { stdio: "ignore" });
  return !result.error && result.status === 0;
}

if (!dockerIsReady() && process.platform === "darwin") {
  console.log("[docker] Opening Docker Desktop...");
  const open = run("open", ["-a", "Docker"]);
  if (open.error || open.status !== 0) {
    console.error(`[docker] Could not open Docker Desktop${open.error ? `: ${open.error.message}` : ` (exit ${open.status})`}`);
    process.exit(1);
  }
}

if (!dockerIsReady()) {
  console.log("[docker] Waiting for Docker Engine...");
  for (let attempt = 0; attempt < 60; attempt += 1) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    if (dockerIsReady()) process.exit(0);
  }
  console.error("[docker] Docker Engine is not ready. Start Docker Desktop or the Docker daemon, then retry.");
  process.exit(1);
}

import { spawnSync } from "node:child_process";
import net from "node:net";

export function getNextPort() {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid Next.js PORT value: ${process.env.PORT}`);
  }
  return port;
}

function getDockerContainerOnPort(port) {
  try {
    const result = spawnSync("docker", ["ps", "--filter", `publish=${port}`, "--format", "{{.Names}}"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (result.status === 0 && result.stdout) {
      const names = result.stdout.trim().split("\n").filter(Boolean);
      if (names.length > 0) return names.join(", ");
    }
  } catch {}
  return null;
}

export function assertNextPortAvailable(port = getNextPort()) {
  return (async () => {
    for (const host of ["::", "0.0.0.0", "127.0.0.1"]) {
      const available = await canBind(port, host);
      if (!available) {
        const dockerContainer = getDockerContainerOnPort(port);
        const containerHint = dockerContainer
          ? ` (in use by Docker container "${dockerContainer}"; stop it with "docker stop ${dockerContainer.split(", ")[0]}" or "pnpm kill:port-3000")`
          : "";
        throw new Error(`Port ${port} is already in use${containerHint}. Stop the other RMS server (pnpm dev or pnpm start) before starting this one.`);
      }
    }
  })();
}

function canBind(port, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error) => {
      if (["EADDRINUSE", "EAFNOSUPPORT", "EADDRNOTAVAIL"].includes(error.code)) {
        resolve(error.code !== "EADDRINUSE");
      } else {
        reject(error);
      }
    });
    server.listen({ port, host, exclusive: true }, () => {
      server.close((error) => error ? reject(error) : resolve(true));
    });
  });
}

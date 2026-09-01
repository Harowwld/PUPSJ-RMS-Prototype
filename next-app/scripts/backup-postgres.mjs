import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

dotenv.config({ path: ".env.local" });
dotenv.config();

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const dataDir = path.resolve(process.env.LOCAL_DATA_DIR || ".local");
const backupDir = path.join(dataDir, "postgres-backups");
const filename = `pupsj-rms-${new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z")}.dump`;
const output = path.join(backupDir, filename);
fs.mkdirSync(backupDir, { recursive: true });

const hostDump = spawnSync("pg_dump", ["--format=custom", "--file", output, process.env.DATABASE_URL], { encoding: "utf8" });
if (hostDump.error?.code === "ENOENT") {
  const dockerDump = spawnSync("docker", ["exec", "pupsj-rms-postgres", "pg_dump", "--format=custom", "--username", "pupsj_rms", "--dbname", "pupsj_rms"], { encoding: null });
  if (dockerDump.error) throw new Error(`pg_dump and Docker are unavailable: ${dockerDump.error.message}`);
  if (dockerDump.status !== 0) throw new Error(dockerDump.stderr?.toString() || `Docker pg_dump exited with status ${dockerDump.status}`);
  fs.writeFileSync(output, dockerDump.stdout);
} else if (hostDump.status !== 0) {
  throw new Error(hostDump.stderr || `pg_dump exited with status ${hostDump.status}`);
}

const stat = fs.statSync(output);
console.log(`PostgreSQL backup created: ${output} (${stat.size} bytes)`);
console.log("Restore procedure: pg_restore --clean --if-exists --dbname=\"$DATABASE_URL\" <backup-file>");

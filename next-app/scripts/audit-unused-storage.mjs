import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import { query, pool } from "../src/lib/postgres.js";
import { getLocalDataDir } from "../src/lib/officePaths.js";
import { heroMediaFilename, heroMediaPath } from "../src/lib/landingHeroMedia.js";

async function listFiles(directory) {
  return readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
}

async function describeFile(filePath) {
  const info = await stat(filePath);
  return { filename: path.basename(filePath), bytes: info.size, modified: info.mtime.toISOString() };
}

try {
  const candidates = [];
  const heroDirectory = path.dirname(heroMediaPath("placeholder"));
  const settings = await query("SELECT value FROM settings WHERE strpos(value, $1) > 0", ["/assets/landing/"]);
  for (const entry of await listFiles(heroDirectory)) {
    const src = `/assets/landing/${entry.name}`;
    if (!entry.isFile() || !heroMediaFilename(src) || settings.some(({ value }) => value.includes(src))) continue;
    candidates.push(await describeFile(path.join(heroDirectory, entry.name)));
  }
  console.log("Hero uploads without a saved reference. This can include open drafts.");
  console.table(candidates);

  const localDir = getLocalDataDir();
  const dumps = await listFiles(localDir);
  console.log("Temporary backup dumps. This can include running backups.");
  console.table(await Promise.all(dumps
    .filter((entry) => entry.isFile() && /^[a-z0-9-]+-backup-temp-(?:\d+|[a-f0-9-]{36})\.sql$/i.test(entry.name))
    .map((entry) => describeFile(path.join(localDir, entry.name)))));
} finally {
  await pool.end();
}

import { lstat, unlink } from "node:fs/promises";
import path from "node:path";

const MEDIA_PREFIX = "/assets/landing/";
const HERO_FILENAME = /^hero-\d+-[a-f0-9]{12}\.(?:jpg|png|webp|avif)$/i;

export function heroMediaFilename(src) {
  if (typeof src !== "string" || !src.startsWith(MEDIA_PREFIX)) return null;
  const filename = src.slice(MEDIA_PREFIX.length);
  return HERO_FILENAME.test(filename) ? filename : null;
}

export function heroMediaPath(filename) {
  return path.join(process.cwd(), "public", "assets", "landing", filename);
}

export function lockHeroMedia(db) {
  return db.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["landing_hero_content"]);
}

export async function removeUnusedHeroMedia(db, filename) {
  const reference = await db.queryOne(
    "SELECT key FROM settings WHERE strpos(value, $1) > 0 LIMIT 1",
    [MEDIA_PREFIX + filename],
  );
  if (reference) return "in-use";

  try {
    const file = heroMediaPath(filename);
    if (!(await lstat(file)).isFile()) return "missing";
    await unlink(file);
    return "deleted";
  } catch (error) {
    if (error.code === "ENOENT") return "missing";
    throw error;
  }
}

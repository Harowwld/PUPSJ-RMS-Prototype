/**
 * Wipes students, documents, courses, sections, document types, audit logs, backup records,
 * and app settings (except schema version), clears uploaded PDFs and backup ZIPs.
 * Preserves staff (login users).
 *
 * Usage:
 *   From repo root: node scripts/reset-students.mjs --confirm
 *   From next-app/:  node scripts/reset-students.mjs --confirm
 *   Or: CONFIRM=1 node scripts/reset-students.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { getDb, reloadDb } from "../src/lib/sqlite.js";

const SCHEMA_VERSION = "3";

function getLocalDir() {
  return process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");
}

function persistDatabase(db) {
  const dbPath = path.join(getLocalDir(), "db.sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function emptyDirFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    try {
      const st = fs.statSync(p);
      if (st.isFile()) fs.unlinkSync(p);
    } catch {
      // ignore
    }
  }
}

async function main() {
  const ok =
    process.argv.includes("--confirm") || String(process.env.CONFIRM || "") === "1";
  if (!ok) {
    console.error(
      "[reset-students] Refusing to run: pass --confirm or set CONFIRM=1 (staff users are kept)."
    );
    process.exit(1);
  }

  const db = await getDb();

  db.exec("PRAGMA foreign_keys = OFF;");

  const tablesToClear = [
    "documents",
    "students",
    "courses",
    "sections",
    "document_types",
    "audit_logs",
    "backups",
    "settings",
  ];

  for (const table of tablesToClear) {
    try {
      db.exec(`DELETE FROM ${table};`);
    } catch (e) {
      console.error(`[reset-students] Failed to clear ${table}:`, e?.message || e);
      throw e;
    }
  }

  for (const table of [
    "documents",
    "document_types",
    "courses",
    "sections",
    "audit_logs",
    "backups",
  ]) {
    try {
      db.exec(`DELETE FROM sqlite_sequence WHERE name = '${table}';`);
    } catch {
      // sqlite_sequence may be missing in some builds
    }
  }

  db.exec(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}')`
  );

  persistDatabase(db);

  const uploadsDir = path.join(getLocalDir(), "uploads");
  emptyDirFiles(uploadsDir);

  const backupsDir = path.join(getLocalDir(), "backups");
  emptyDirFiles(backupsDir);

  console.log("[reset-students] Done: cleared students, documents, metadata, logs, uploads, and backup files. Staff users unchanged.");
  console.log("[reset-students] Restart the Next.js dev server if it is running.");
}

main()
  .catch((err) => {
    console.error("[reset-students] Failed:", err?.message || err);
    process.exit(1);
  })
  .finally(() => {
    reloadDb();
  });

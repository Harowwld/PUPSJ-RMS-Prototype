import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

// Use global variable to persist DB connection across HMR reloads in development
let db = global.sqliteDb || null;
let SQL = global.sqliteLib || null;
let initializing = null;

function getDbFilePath() {
  const base = process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");

  return path.join(base, "db.sqlite");
}

export async function getDb() {
  if (db) return db;
  if (initializing) return initializing;

  initializing = (async () => {
    try {
      const dbPath = getDbFilePath();
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      if (!SQL) {
        const require = createRequire(import.meta.url);
        const initSqlJs = require("sql.js/dist/sql-asm.js");
        SQL = await initSqlJs();
        global.sqliteLib = SQL;
      }

      if (fs.existsSync(dbPath)) {
        const bytes = fs.readFileSync(dbPath);
        db = new SQL.Database(bytes);
      } else {
        db = new SQL.Database();
      }
      global.sqliteDb = db;

      // Initial Schema
      db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_no TEXT NOT NULL,
          student_name TEXT,
          doc_type TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          storage_filename TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS document_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          name_norm TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS courses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS sections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS students (
          student_no TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          course_code TEXT NOT NULL,
          year_level INTEGER NOT NULL,
          section TEXT NOT NULL,
          room INTEGER NOT NULL,
          cabinet TEXT NOT NULL,
          drawer INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'Active',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS staff (
          id TEXT PRIMARY KEY,
          fname TEXT NOT NULL,
          lname TEXT NOT NULL,
          role TEXT NOT NULL,
          section TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Active',
          email TEXT NOT NULL,
          last_active TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          actor TEXT NOT NULL,
          role TEXT NOT NULL,
          action TEXT NOT NULL,
          ip TEXT
        );

        CREATE TABLE IF NOT EXISTS backups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          checksum TEXT NOT NULL,
          status_local TEXT DEFAULT 'Pending',
          status_external TEXT DEFAULT 'Pending',
          status_offsite TEXT DEFAULT 'Pending',
          encryption_key_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

    CREATE INDEX IF NOT EXISTS idx_documents_student_no ON documents(student_no);
    CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
    CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

    CREATE INDEX IF NOT EXISTS idx_document_types_name ON document_types(name);
    CREATE INDEX IF NOT EXISTS idx_document_types_name_norm ON document_types(name_norm);

    CREATE INDEX IF NOT EXISTS idx_students_course_year_section ON students(course_code, year_level, section);
    CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);

    CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(lname, fname);
    CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
    CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  `);

      // Migration Check
      let schemaVersion = 0;
      try {
        const res = db.exec("SELECT value FROM settings WHERE key = 'schema_version'");
        if (res && res.length > 0) schemaVersion = parseInt(res[0].values[0][0]) || 0;
      } catch (e) {
        // settings table might not exist yet if db.exec failed somehow
      }

      if (schemaVersion < 1) {
        // Migrations & Data Backfill
        try { db.exec("ALTER TABLE staff ADD COLUMN password_hash TEXT"); } catch (e) {}
        try { db.exec("ALTER TABLE staff ADD COLUMN last_active TEXT"); } catch (e) {}
        try { db.exec("ALTER TABLE staff ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))"); } catch (e) {}

        // Default Password for Staff
        try {
          const defaultHash = crypto.createHash("sha256").update("pupstaff").digest("hex");
          db.exec(`UPDATE staff SET password_hash = '${defaultHash}' WHERE password_hash IS NULL OR password_hash = ''`);
        } catch (e) {}

        // Year Level Migration
        try {
          db.exec("UPDATE students SET year_level = 2024 + year_level WHERE year_level IS NOT NULL AND year_level < 100");
        } catch (e) {}

        // Document Types Normalization Migration
        try {
          db.exec("ALTER TABLE document_types ADD COLUMN name_norm TEXT");
        } catch (e) {}

        try {
          const rows = db.exec("SELECT id, name FROM document_types");
          if (rows && rows.length > 0) {
            const values = rows[0].values;
            for (const r of values) {
              const id = r[0];
              const name = String(r[1] || "");
              const nameNorm = name.trim().toLowerCase().replace(/\s+/g, " ");
              if (id && nameNorm) {
                db.exec(`UPDATE document_types SET name_norm = '${nameNorm.replace(/'/g, "''")}' WHERE id = ${id}`);
              }
            }
          }
        } catch (e) {}

        try {
          db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_document_types_name_norm_unique ON document_types(name_norm)");
        } catch (e) {}

        // Seed Document Types if empty
        try {
          const res = db.exec("SELECT COUNT(*) FROM document_types");
          const count = res[0].values[0][0];
          if (count === 0) {
            const defaults = [
              "Form 137", "Transcript of Records", "Good Moral Certificate",
              "Diploma", "Honorable Dismissal", "Medical Certificate", "Birth Certificate"
            ];
            for (const name of defaults) {
              const nameNorm = name.trim().toLowerCase().replace(/\s+/g, " ");
              db.exec(`INSERT INTO document_types (name, name_norm) VALUES ('${name.replace(/'/g, "''")}', '${nameNorm.replace(/'/g, "''")}')`);
            }
          }
        } catch (e) {}

        db.exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '1')");
        persistDb();
      }

      initializing = null;
      return db;
    } catch (err) {

      initializing = null;
      throw err;
    }
  })();

  return initializing;
}

function persistDb() {
  if (!db) return;
  try {
    const dbPath = getDbFilePath();
    const bytes = db.export();
    fs.writeFileSync(dbPath, Buffer.from(bytes));
  } catch (err) {
    console.error("[DB] Persistence Error:", err);
  }
}

function normalizeParams(params) {
  if (params === undefined || params === null) return [];
  if (Array.isArray(params)) return params;
  return [params];
}

export async function dbAll(sql, params) {
  const database = await getDb();
  const stmt = database.prepare(sql);
  try {
    stmt.bind(normalizeParams(params));
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

export async function dbGet(sql, params) {
  const database = await getDb();
  const stmt = database.prepare(sql);
  try {
    stmt.bind(normalizeParams(params));
    if (!stmt.step()) return null;
    return stmt.getAsObject();
  } finally {
    stmt.free();
  }
}

export async function dbRun(sql, params) {
  const database = await getDb();
  const stmt = database.prepare(sql);
  try {
    stmt.bind(normalizeParams(params));
    stmt.step();
  } finally {
    stmt.free();
  }

  const meta = await dbGet("SELECT changes() AS changes, last_insert_rowid() AS lastInsertRowid");
  persistDb();
  return {
    changes: meta?.changes ?? 0,
    lastInsertRowid: meta?.lastInsertRowid ?? null,
  };
}

export function reloadDb() {
  if (db) {
    try {
      db.close();
    } catch (e) {
      // ignore
    }
  }
  db = null;
  initializing = null;
  console.log("[DB] In-memory database cache cleared for reload.");
}

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

let db;
let SQL;
let initializing;

function getDbFilePath() {
  const base = process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");

  return path.join(base, "db.sqlite");
}

export function getDb() {
  if (db) return Promise.resolve(db);
  if (initializing) return initializing;

  initializing = (async () => {
    const dbPath = getDbFilePath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    if (!SQL) {
      const require = createRequire(import.meta.url);
      const initSqlJs = require("sql.js/dist/sql-asm.js");
      SQL = await initSqlJs();
    }

    if (fs.existsSync(dbPath)) {
      const bytes = fs.readFileSync(dbPath);
      db = new SQL.Database(bytes);
    } else {
      db = new SQL.Database();
    }

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

    CREATE INDEX IF NOT EXISTS idx_documents_student_no ON documents(student_no);
    CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
    CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

    CREATE INDEX IF NOT EXISTS idx_document_types_name ON document_types(name);

    CREATE INDEX IF NOT EXISTS idx_students_course_year_section ON students(course_code, year_level, section);
    CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);

    CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(lname, fname);
    CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
    CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  `);

    try {
      db.exec("ALTER TABLE staff ADD COLUMN password_hash TEXT");
    } catch {
      // ignore if column already exists
    }

    try {
      db.exec("ALTER TABLE staff ADD COLUMN last_active TEXT");
    } catch {
      // ignore if column already exists
    }

    try {
      db.exec("ALTER TABLE staff ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))");
    } catch {
      // ignore if column already exists
    }

    try {
      const defaultHash = crypto
        .createHash("sha256")
        .update("pupstaff")
        .digest("hex");
      db.exec(
        `UPDATE staff
         SET password_hash = '${defaultHash}'
         WHERE password_hash IS NULL OR password_hash = ''`
      );
    } catch {
      // ignore backfill errors
    }

    try {
      db.exec(
        `UPDATE students
         SET year_level = 2024 + year_level
         WHERE year_level IS NOT NULL AND year_level < 100`
      );
    } catch {
      // ignore migration errors
    }

    try {
      const row = db.exec("SELECT COUNT(*) AS c FROM document_types");
      const c = row?.[0]?.values?.[0]?.[0] ?? 0;
      if (Number(c) === 0) {
        const defaults = [
          "Form 137",
          "Transcript of Records",
          "Good Moral Certificate",
          "Diploma",
          "Honorable Dismissal",
          "Medical Certificate",
          "Birth Certificate",
        ];
        for (const name of defaults) {
          try {
            db.exec(
              `INSERT INTO document_types (name) VALUES ('${String(name).replace(/'/g, "''")}')`
            );
          } catch {
            // ignore duplicates
          }
        }
      }
    } catch {
      // ignore seed errors
    }

    persistDb();
    return db;
  })();

  return initializing;
}

function persistDb() {
  if (!db) return;
  const dbPath = getDbFilePath();
  const bytes = db.export();
  fs.writeFileSync(dbPath, Buffer.from(bytes));
}

function normalizeParams(params) {
  if (!params) return [];
  if (Array.isArray(params)) return params;
  // sql.js only supports positional binding in a straightforward way; keep repos using arrays.
  return [];
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

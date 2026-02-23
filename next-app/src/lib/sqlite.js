import fs from "node:fs";
import path from "node:path";
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

    CREATE INDEX IF NOT EXISTS idx_documents_student_no ON documents(student_no);
    CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
    CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

    CREATE INDEX IF NOT EXISTS idx_students_course_year_section ON students(course_code, year_level, section);
    CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
  `);

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

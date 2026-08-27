/**
 * Office Database Connection Manager
 *
 * Each office gets its own SQLite database file under .local/<officeId>/db.sqlite.
 * This module manages a connection pool keyed by officeId and initializes
 * each office's database with the appropriate schema template.
 *
 * The Registrar office uses the exact same schema as the original sqlite.js.
 * OSAS (and future offices) can have their own schema shape.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { AsyncLocalStorage } from "node:async_hooks";

export const officeLocalStorage = new AsyncLocalStorage();

/**
 * Connection pool: { [officeId]: Database }
 * Cached on the global object to survive HMR in development.
 */
const pool = global.__officeDbPool || {};
global.__officeDbPool = pool;

function getLocalDataRoot() {
  return process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");
}

/**
 * Returns the filesystem path for an office's database.
 */
export function getOfficeDbPath(officeId) {
  const localRoot = getLocalDataRoot();
  return path.join(localRoot, officeId, "db.sqlite");
}

/**
 * Returns the uploads directory for an office.
 */
export function getOfficeUploadsDir(officeId) {
  const localRoot = getLocalDataRoot();
  return path.join(localRoot, officeId, "uploads");
}

/**
 * Returns the backups directory for an office.
 */
export function getOfficeBackupsDir(officeId) {
  const localRoot = getLocalDataRoot();
  return path.join(localRoot, officeId, "backups");
}

function tableExistsInDb(db, tableName) {
  if (!db) return false;
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
  return !!row;
}

function columnExistsInDb(db, tableName, columnName) {
  if (!db) return false;
  const columns = db.pragma(`table_info(${tableName})`);
  return columns.some(col => col.name === columnName);
}


/**
 * Schema templates by office type.
 *
 * "registrar" uses the full original schema (students with room/cabinet/drawer,
 * storage layout, document requests, etc.).
 *
 * "default" is the base template for new offices that don't need physical storage.
 * OSAS currently uses the "default" template.
 */
const SCHEMA_TEMPLATES = {
  /**
   * Registrar-specific schema — matches the original sqlite.js tables
   * minus the staff table (which now lives in system.sqlite).
   */
  registrar: (db) => {
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
        approval_status TEXT NOT NULL DEFAULT 'Pending',
        reviewed_by TEXT,
        reviewed_at TEXT,
        review_note TEXT,
        uploaded_by TEXT,
        is_previewed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (student_no) REFERENCES students(student_no) ON UPDATE CASCADE ON DELETE RESTRICT,
        FOREIGN KEY (doc_type) REFERENCES document_types(name) ON UPDATE CASCADE ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS document_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        name_norm TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        course_code TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(name, course_code),
        FOREIGN KEY (course_code) REFERENCES courses(code) ON UPDATE CASCADE ON DELETE SET NULL
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
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (course_code) REFERENCES courses(code) ON UPDATE CASCADE ON DELETE RESTRICT,
        FOREIGN KEY (section, course_code) REFERENCES sections(name, course_code) ON UPDATE CASCADE ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS document_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_no TEXT NOT NULL,
        doc_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        notes TEXT,
        linked_document_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_by TEXT,
        updated_by TEXT,
        FOREIGN KEY (student_no) REFERENCES students(student_no) ON UPDATE CASCADE ON DELETE RESTRICT,
        FOREIGN KEY (doc_type) REFERENCES document_types(name) ON UPDATE CASCADE ON DELETE RESTRICT,
        FOREIGN KEY (linked_document_id) REFERENCES documents(id) ON UPDATE CASCADE ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        actor TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        severity TEXT NOT NULL DEFAULT 'INFO',
        user_agent TEXT,
        entity_type TEXT,
        entity_id TEXT,
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

      CREATE TABLE IF NOT EXISTS ingest_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_filename TEXT NOT NULL,
        storage_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        source_station TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        promoted_document_id INTEGER,
        last_error TEXT,
        content_sha256 TEXT,
        FOREIGN KEY (promoted_document_id) REFERENCES documents(id) ON UPDATE CASCADE ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS scan_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        pair_token_hash TEXT,
        token_expires_at TEXT,
        paired_at TEXT,
        last_heartbeat_at TEXT,
        phone_label TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS scan_session_incoming (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        client_ref TEXT,
        storage_filename TEXT,
        filename TEXT,
        mime_type TEXT,
        size_bytes INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES scan_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS staff_notification_state (
        staff_id TEXT PRIMARY KEY,
        last_seen_reviewed_at TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS staff_notification_item_states (
        staff_id TEXT NOT NULL,
        notification_id INTEGER NOT NULL,
        is_read INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        PRIMARY KEY (staff_id, notification_id),
        FOREIGN KEY (notification_id) REFERENCES documents(id) ON UPDATE CASCADE ON DELETE CASCADE
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_documents_student_no ON documents(student_no);
      CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
      CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
      CREATE INDEX IF NOT EXISTS idx_documents_approval_status ON documents(approval_status);
      CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_document_types_name ON document_types(name);
      CREATE INDEX IF NOT EXISTS idx_document_types_name_norm ON document_types(name_norm);
      CREATE INDEX IF NOT EXISTS idx_students_course_year_section ON students(course_code, year_level, section);
      CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
      CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
      CREATE INDEX IF NOT EXISTS idx_sections_course_code ON sections(course_code);
      CREATE INDEX IF NOT EXISTS idx_document_requests_student_no ON document_requests(student_no);
      CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status);
      CREATE INDEX IF NOT EXISTS idx_document_requests_created_at ON document_requests(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_ingest_queue_status_created_at ON ingest_queue(status, created_at);
      CREATE INDEX IF NOT EXISTS idx_ingest_queue_sha256 ON ingest_queue(content_sha256);
      CREATE INDEX IF NOT EXISTS idx_scan_sessions_staff_created ON scan_sessions(staff_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_scan_sessions_token_hash ON scan_sessions(pair_token_hash);
      CREATE INDEX IF NOT EXISTS idx_scan_session_incoming_session_created ON scan_session_incoming(session_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_staff_notification_state_updated_at ON staff_notification_state(updated_at);
      CREATE INDEX IF NOT EXISTS idx_staff_notification_item_states_lookup ON staff_notification_item_states(staff_id, notification_id);
    `);
  },

  /**
   * Default schema for new offices (e.g., OSAS).
   * Simplified student table (no room/cabinet/drawer), no document_requests, no storage.
   */
  default: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_no TEXT,
        student_name TEXT,
        doc_type TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        storage_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        approval_status TEXT NOT NULL DEFAULT 'Pending',
        reviewed_by TEXT,
        reviewed_at TEXT,
        review_note TEXT,
        uploaded_by TEXT,
        is_previewed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (doc_type) REFERENCES document_types(name) ON UPDATE CASCADE ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS document_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        name_norm TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        course_code TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(name, course_code),
        FOREIGN KEY (course_code) REFERENCES courses(code) ON UPDATE CASCADE ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS students (
        student_no TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        course_code TEXT NOT NULL,
        year_level INTEGER NOT NULL,
        section TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (course_code) REFERENCES courses(code) ON UPDATE CASCADE ON DELETE RESTRICT,
        FOREIGN KEY (section, course_code) REFERENCES sections(name, course_code) ON UPDATE CASCADE ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        actor TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        severity TEXT NOT NULL DEFAULT 'INFO',
        user_agent TEXT,
        entity_type TEXT,
        entity_id TEXT,
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

      CREATE TABLE IF NOT EXISTS scan_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        pair_token_hash TEXT,
        token_expires_at TEXT,
        paired_at TEXT,
        last_heartbeat_at TEXT,
        phone_label TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS scan_session_incoming (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        client_ref TEXT,
        storage_filename TEXT,
        filename TEXT,
        mime_type TEXT,
        size_bytes INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES scan_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS staff_notification_state (
        staff_id TEXT PRIMARY KEY,
        last_seen_reviewed_at TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS staff_notification_item_states (
        staff_id TEXT NOT NULL,
        notification_id INTEGER NOT NULL,
        is_read INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        PRIMARY KEY (staff_id, notification_id),
        FOREIGN KEY (notification_id) REFERENCES documents(id) ON UPDATE CASCADE ON DELETE CASCADE
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_documents_student_no ON documents(student_no);
      CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
      CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
      CREATE INDEX IF NOT EXISTS idx_documents_approval_status ON documents(approval_status);
      CREATE INDEX IF NOT EXISTS idx_document_types_name ON document_types(name);
      CREATE INDEX IF NOT EXISTS idx_document_types_name_norm ON document_types(name_norm);
      CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_scan_sessions_staff_created ON scan_sessions(staff_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_scan_sessions_token_hash ON scan_sessions(pair_token_hash);
      CREATE INDEX IF NOT EXISTS idx_scan_session_incoming_session_created ON scan_session_incoming(session_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_staff_notification_state_updated_at ON staff_notification_state(updated_at);
      CREATE INDEX IF NOT EXISTS idx_staff_notification_item_states_lookup ON staff_notification_item_states(staff_id, notification_id);
    `);
  },
};


/**
 * Get or initialize a database connection for a specific office.
 *
 * @param {string} officeId - Office identifier (e.g., 'registrar', 'osas')
 * @returns {Database} better-sqlite3 Database instance
 */
export async function getOfficeDb(officeId) {
  if (!officeId || typeof officeId !== "string") {
    throw new Error("getOfficeDb: officeId is required");
  }

  const id = officeId.trim().toLowerCase();

  // Check cached connection
  if (pool[id]) {
    try {
      if (typeof pool[id].pragma !== "function") {
        throw new Error("Stale connection");
      }
      pool[id].prepare("SELECT 1").get();
      return pool[id];
    } catch (e) {
      console.log(`[OfficeDB:${id}] Stale connection. Re-initializing...`);
      delete pool[id];
    }
  }

  const dbPath = getOfficeDbPath(id);
  const dbDir = path.dirname(dbPath);

  // Create office directory structure
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Create uploads directory
  const uploadsDir = getOfficeUploadsDir(id);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Create backups directory
  const backupsDir = getOfficeBackupsDir(id);
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Apply the appropriate schema template
  const templateFn = SCHEMA_TEMPLATES[id] || SCHEMA_TEMPLATES.default;
  templateFn(db);

  pool[id] = db;
  console.log(`[OfficeDB:${id}] Initialized at ${dbPath}`);

  return db;
}

/**
 * Close and remove an office database connection from the pool.
 */
export function closeOfficeDb(officeId) {
  const id = officeId.trim().toLowerCase();
  if (pool[id]) {
    try {
      pool[id].close();
    } catch (e) {
      // ignore
    }
    delete pool[id];
    console.log(`[OfficeDB:${id}] Connection closed.`);
  }
}

/**
 * Close all office database connections.
 */
export function closeAllOfficeDbs() {
  for (const id of Object.keys(pool)) {
    closeOfficeDb(id);
  }
  console.log("[OfficeDB] All connections closed.");
}

/**
 * Helper: run a query returning all rows on an office database.
 */
export async function officeDbAll(officeId, sql, params) {
  const db = await getOfficeDb(officeId);
  const normalized = params === undefined || params === null ? [] : Array.isArray(params) ? params : [params];
  return db.prepare(sql).all(normalized);
}

/**
 * Helper: run a query returning one row on an office database.
 */
export async function officeDbGet(officeId, sql, params) {
  const db = await getOfficeDb(officeId);
  const normalized = params === undefined || params === null ? [] : Array.isArray(params) ? params : [params];
  const row = db.prepare(sql).get(normalized);
  return row || null;
}

/**
 * Helper: run a write query on an office database.
 */
export async function officeDbRun(officeId, sql, params) {
  const db = await getOfficeDb(officeId);
  const normalized = params === undefined || params === null ? [] : Array.isArray(params) ? params : [params];
  const stmt = db.prepare(sql);
  const result = stmt.run(normalized);
  return {
    changes: result.changes,
    lastInsertRowid: result.lastInsertRowid,
  };
}

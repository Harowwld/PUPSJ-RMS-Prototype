import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

// Multi-office architecture: re-export system and office DB utilities
// so consumers can import from the familiar "./sqlite" path if needed.
export { getSystemDb, sysDbAll, sysDbGet, sysDbRun } from "./systemDb.js";
export { getOfficeDb, officeDbAll, officeDbGet, officeDbRun } from "./officeDb.js";

let db = global.sqliteDb || null;

function getDbFilePath() {
  const base = process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");

  return path.join(base, "db.sqlite");
}

const tableExists = (tableName) => {
  if (!db) return false;
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
  return !!row;
};

const columnExists = (tableName, columnName) => {
  if (!db) return false;
  const columns = db.pragma(`table_info(${tableName})`);
  return columns.some(col => col.name === columnName);
};

function ensureDocumentRequestsTable() {
  if (!db) return;
  try {
    if (tableExists("document_requests")) return;

    db.exec(`
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
        FOREIGN KEY (linked_document_id) REFERENCES documents(id) ON UPDATE CASCADE ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE SET NULL,
        FOREIGN KEY (updated_by) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_document_requests_student_no ON document_requests(student_no);
      CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status);
      CREATE INDEX IF NOT EXISTS idx_document_requests_created_at ON document_requests(created_at);
    `);
    
    try {
      const verRow = db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").get();
      const v = verRow ? parseInt(String(verRow.value), 10) : 0;
      if (!Number.isFinite(v) || v < 5) {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '5')").run();
      }
    } catch {
      // ignore
    }
  } catch (e) {
    console.error("[DB] ensureDocumentRequestsTable:", e);
  }
}

function ensureIngestQueueTable() {
  if (!db) return;
  try {
    if (tableExists("ingest_queue")) return;
    db.exec(`
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
      CREATE INDEX IF NOT EXISTS idx_ingest_queue_status_created_at ON ingest_queue(status, created_at);
      CREATE INDEX IF NOT EXISTS idx_ingest_queue_sha256 ON ingest_queue(content_sha256);
    `);
    
    try {
      const verRow = db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").get();
      const v = verRow ? parseInt(String(verRow.value), 10) : 0;
      if (!Number.isFinite(v) || v < 8) {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '8')").run();
      }
    } catch {}
  } catch (e) {
    console.error("[DB] ensureIngestQueueTable:", e);
  }
}

function ensureScanSessionTables() {
  if (!db) return;
  try {
    db.exec(`
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
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_scan_sessions_staff_created ON scan_sessions(staff_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_scan_sessions_token_hash ON scan_sessions(pair_token_hash);

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
      CREATE INDEX IF NOT EXISTS idx_scan_session_incoming_session_created ON scan_session_incoming(session_id, created_at DESC);
    `);
    
    try {
      const verRow = db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").get();
      const v = verRow ? parseInt(String(verRow.value), 10) : 0;
      if (!Number.isFinite(v) || v < 6) {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '6')").run();
      }
    } catch {
      // ignore
    }
    
    if (!columnExists("scan_session_incoming", "storage_filename")) {
      db.exec("ALTER TABLE scan_session_incoming ADD COLUMN storage_filename TEXT");
    }
  } catch (e) {
    console.error("[DB] ensureScanSessionTables:", e);
  }
}

function ensureStaffNotificationStateTable() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS staff_notification_state (
        staff_id TEXT PRIMARY KEY,
        last_seen_reviewed_at TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_staff_notification_state_updated_at
        ON staff_notification_state(updated_at);

      CREATE TABLE IF NOT EXISTS staff_notification_item_states (
        staff_id TEXT NOT NULL,
        notification_id INTEGER NOT NULL,
        is_read INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        PRIMARY KEY (staff_id, notification_id),
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (notification_id) REFERENCES documents(id) ON UPDATE CASCADE ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_staff_notification_item_states_lookup 
        ON staff_notification_item_states(staff_id, notification_id);
    `);
  } catch (e) {
    console.error("[DB] ensureStaffNotificationStateTable:", e);
  }
}

function ensureRecoveryCodesTable() {
  if (!db) return;
  try {
    if (tableExists("staff_recovery_codes")) return;
    db.exec(`
      CREATE TABLE IF NOT EXISTS staff_recovery_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_recovery_codes_staff_id ON staff_recovery_codes(staff_id);
    `);
  } catch (e) {
    console.error("[DB] ensureRecoveryCodesTable:", e);
  }
}

export const DEFAULT_SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What high school did you attend?",
  "What is the name of the street you grew up on?",
  "What was your childhood nickname?",
];

export async function getDb() {
  if (global.sqliteMaintenanceMode) {
    throw new Error("Database is undergoing scheduled maintenance/restoration. Please try again in a moment.");
  }

  // 1. Check if office context is set in AsyncLocalStorage (for manual script/task scopes)
  try {
    const { officeLocalStorage } = await import("./officeDb.js");
    const store = officeLocalStorage.getStore();
    if (store && store.officeId) {
      const { getOfficeDb } = await import("./officeDb.js");
      return getOfficeDb(store.officeId);
    }
  } catch (e) {
    // Ignore
  }

  // 2. Check if we're in a Next.js request context and read headers
  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const officeId = headersList.get("x-office-id");
    const userRole = headersList.get("x-user-role");

    if (officeId) {
      const { getOfficeDb } = await import("./officeDb.js");
      return getOfficeDb(officeId);
    }

    // SystemAdmin context: they don't have a default office_id, so they default to 'registrar'
    // but they can pass an override header (x-office-override)
    if (userRole === "SystemAdmin" || userRole === "SuperAdmin") {
      const overrideOfficeId = headersList.get("x-office-override");
      if (overrideOfficeId) {
        const { getOfficeDb } = await import("./officeDb.js");
        return getOfficeDb(overrideOfficeId);
      }
    }
  } catch (e) {
    // Ignore
  }

  // 3. Fallback to cached default database (Registrar)
  if (db) {
    try {
      if (typeof db.pragma !== "function") {
        throw new Error("Stale database connection.");
      }
      db.prepare("SELECT 1").get();
      return db;
    } catch (e) {
      db = null;
      global.sqliteDb = null;
    }
  }

  const { getOfficeDb } = await import("./officeDb.js");
  db = getOfficeDb("registrar");
  global.sqliteDb = db;
  return db;
}

export async function dbAll(sql, params) {
  const database = await getDb();
  const normalized = params === undefined || params === null ? [] : Array.isArray(params) ? params : [params];
  return database.prepare(sql).all(normalized);
}

export async function dbGet(sql, params) {
  const database = await getDb();
  const normalized = params === undefined || params === null ? [] : Array.isArray(params) ? params : [params];
  const row = database.prepare(sql).get(normalized);
  return row || null;
}

export async function dbRun(sql, params) {
  const database = await getDb();
  const normalized = params === undefined || params === null ? [] : Array.isArray(params) ? params : [params];
  const stmt = database.prepare(sql);
  const result = stmt.run(normalized);
  return {
    changes: result.changes,
    lastInsertRowid: result.lastInsertRowid,
  };
}

export function reloadDb() {
  if (db) {
    try {
      db.close();
      console.log("[DB] better-sqlite3 connection closed.");
    } catch (e) {
      // ignore
    }
  }
  db = null;
  global.sqliteDb = null;
  console.log("[DB] In-memory connection cache cleared for reload.");
}

export function setMaintenanceMode(enabled) {
  global.sqliteMaintenanceMode = enabled;
  if (enabled) {
    reloadDb();
    console.log("[DB] Maintenance mode ENABLED. Connection closed.");
  } else {
    console.log("[DB] Maintenance mode DISABLED. Ready for connections.");
  }
}

function ensureSerialKeyColumn() {
  if (!db) return;
  try {
    if (!columnExists("staff", "serial_key_hash")) {
      db.exec("ALTER TABLE staff ADD COLUMN serial_key_hash TEXT");
      console.log("[DB] Added missing serial_key_hash column to staff table.");
    }
  } catch (e) {
    console.error("[DB] ensureSerialKeyColumn:", e);
  }
}

function ensureStaffPreferencesColumn() {
  if (!db) return;
  try {
    if (!columnExists("staff", "preferences")) {
      db.exec("ALTER TABLE staff ADD COLUMN preferences TEXT DEFAULT '{}'");
      console.log("[DB] Added missing preferences column to staff table.");
    }
    // Cleanse any invalid NULL or empty preferences records to standard '{}'
    db.exec("UPDATE staff SET preferences = '{}' WHERE preferences IS NULL OR TRIM(preferences) = ''");
  } catch (e) {
    console.error("[DB] ensureStaffPreferencesColumn:", e);
  }
}

function ensureStaffAvatarColumn() {
  if (!db) return;
  try {
    if (!columnExists("staff", "avatar_filename")) {
      db.exec("ALTER TABLE staff ADD COLUMN avatar_filename TEXT");
      console.log("[DB] Added missing avatar_filename column to staff table.");
    }
  } catch (e) {
    console.error("[DB] ensureStaffAvatarColumn:", e);
  }
}

function ensureChatMessagesTable() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id TEXT NOT NULL,
        recipient_id TEXT,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        is_read INTEGER DEFAULT 0,
        FOREIGN KEY (sender_id) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_recipient ON chat_messages(sender_id, recipient_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
    `);

    // Migration to add is_deleted column
    if (!columnExists("chat_messages", "is_deleted")) {
      db.exec("ALTER TABLE chat_messages ADD COLUMN is_deleted INTEGER DEFAULT 0");
      console.log("[DB] Added missing is_deleted column to chat_messages table.");
    }

    // Migration to add is_edited column
    if (!columnExists("chat_messages", "is_edited")) {
      db.exec("ALTER TABLE chat_messages ADD COLUMN is_edited INTEGER DEFAULT 0");
      console.log("[DB] Added missing is_edited column to chat_messages table.");
    }

    // Migration to add updated_at column
    if (!columnExists("chat_messages", "updated_at")) {
      db.exec("ALTER TABLE chat_messages ADD COLUMN updated_at TEXT");
      console.log("[DB] Added missing updated_at column to chat_messages table.");
    }

    // Migration to add original_message column
    if (!columnExists("chat_messages", "original_message")) {
      db.exec("ALTER TABLE chat_messages ADD COLUMN original_message TEXT");
      console.log("[DB] Added missing original_message column to chat_messages table.");
    }

    // Migration to add image_filename column
    if (!columnExists("chat_messages", "image_filename")) {
      db.exec("ALTER TABLE chat_messages ADD COLUMN image_filename TEXT");
      console.log("[DB] Added missing image_filename column to chat_messages table.");
    }

    // Migration to add mime_type column
    if (!columnExists("chat_messages", "mime_type")) {
      db.exec("ALTER TABLE chat_messages ADD COLUMN mime_type TEXT");
      console.log("[DB] Added missing mime_type column to chat_messages table.");
    }

    // Create chat_message_deletions table for soft-deletion by other users
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_message_deletions (
        message_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        PRIMARY KEY (message_id, user_id),
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    console.log("[DB] Checked/Created chat_messages and deletions tables.");
  } catch (e) {
    console.error("[DB] ensureChatMessagesTable:", e);
  }
}

function ensureBirthCertificateDocType() {
  if (!db) return;
  try {
    db.prepare("INSERT OR IGNORE INTO document_types (name, name_norm) VALUES ('Birth Certificate', 'birth certificate')").run();
  } catch (e) {
    console.error("[DB] ensureBirthCertificateDocType:", e);
  }
}


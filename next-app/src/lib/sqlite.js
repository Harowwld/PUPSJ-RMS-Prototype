import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

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
    if (tableExists("staff_notification_state")) return;
    db.exec(`
      CREATE TABLE IF NOT EXISTS staff_notification_state (
        staff_id TEXT PRIMARY KEY,
        last_seen_reviewed_at TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_staff_notification_state_updated_at
        ON staff_notification_state(updated_at);
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

  if (db) {
    try {
      if (typeof db.pragma !== "function") {
        throw new Error("Stale non-better-sqlite3 database instance detected in cache.");
      }
      db.prepare("SELECT 1").get();
      return db;
    } catch (e) {
      console.log("[DB] Stale or invalid cached database connection. Re-initializing...");
      db = null;
      global.sqliteDb = null;
    }
  }

  try {
    const dbPath = getDbFilePath();
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);
    global.sqliteDb = db;

    // Enable WAL journal mode for concurrent read/write and enforce foreign key constraints
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // Initialize base tables if they don't exist
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
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (student_no) REFERENCES students(student_no) ON UPDATE CASCADE ON DELETE RESTRICT,
        FOREIGN KEY (doc_type) REFERENCES document_types(name) ON UPDATE CASCADE ON DELETE RESTRICT,
        FOREIGN KEY (reviewed_by) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE SET NULL,
        FOREIGN KEY (uploaded_by) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE SET NULL
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
        name TEXT NOT NULL,
        course_code TEXT,
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

      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        fname TEXT NOT NULL,
        lname TEXT NOT NULL,
        role TEXT NOT NULL,
        section TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        email TEXT NOT NULL,
        last_active TEXT,
        totp_secret TEXT,
        totp_enabled INTEGER NOT NULL DEFAULT 0,
        serial_key_hash TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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

      CREATE TABLE IF NOT EXISTS security_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        is_required INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS staff_security_answers (
        staff_id TEXT NOT NULL,
        question_id INTEGER NOT NULL,
        answer_hash TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (staff_id, question_id),
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES security_questions(id) ON UPDATE CASCADE ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_documents_student_no ON documents(student_no);
      CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
      CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
      CREATE INDEX IF NOT EXISTS idx_documents_approval_status ON documents(approval_status);
      CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

      CREATE INDEX IF NOT EXISTS idx_document_types_name ON document_types(name);
      CREATE INDEX IF NOT EXISTS idx_document_types_name_norm ON document_types(name_norm);

      CREATE INDEX IF NOT EXISTS idx_students_course_year_section ON students(course_code, year_level, section);
      CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
      CREATE INDEX IF NOT EXISTS idx_sections_course_code ON sections(course_code);

      CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(lname, fname);
      CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
      CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `);

    // Migration Check
    let schemaVersion = 0;
    try {
      const verRow = db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").get();
      if (verRow) schemaVersion = parseInt(verRow.value, 10) || 0;
    } catch (e) {
      // settings table might not exist yet
    }

    if (schemaVersion < 1) {
      if (!columnExists("staff", "password_hash")) {
        try { db.exec("ALTER TABLE staff ADD COLUMN password_hash TEXT"); } catch (e) {}
      }
      if (!columnExists("staff", "last_active")) {
        try { db.exec("ALTER TABLE staff ADD COLUMN last_active TEXT"); } catch (e) {}
      }
      if (!columnExists("staff", "updated_at")) {
        try { db.exec("ALTER TABLE staff ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))"); } catch (e) {}
      }

      // Default Password for Staff
      try {
        const defaultPassword = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
        const defaultHash = crypto.createHash("sha256").update(defaultPassword).digest("hex");
        db.prepare("UPDATE staff SET password_hash = ? WHERE password_hash IS NULL OR password_hash = ''").run(defaultHash);
      } catch (e) {}

      // Year Level Migration
      try {
        db.exec("UPDATE students SET year_level = 2024 + year_level WHERE year_level IS NOT NULL AND year_level < 100");
      } catch (e) {}

      // Document Types Normalization Migration
      if (!columnExists("document_types", "name_norm")) {
        try {
          db.exec("ALTER TABLE document_types ADD COLUMN name_norm TEXT");
        } catch (e) {}
      }

      try {
        const rows = db.prepare("SELECT id, name FROM document_types").all();
        for (const r of rows) {
          const id = r.id;
          const name = String(r.name || "");
          const nameNorm = name.trim().toLowerCase().replace(/\s+/g, " ");
          if (id && nameNorm) {
            db.prepare("UPDATE document_types SET name_norm = ? WHERE id = ?").run(nameNorm, id);
          }
        }
      } catch (e) {}

      try {
        db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_document_types_name_norm_unique ON document_types(name_norm)");
      } catch (e) {}

      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '1')").run();
    }

    if (schemaVersion < 2) {
      if (!columnExists("documents", "approval_status")) {
        try { db.exec("ALTER TABLE documents ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'Pending'"); } catch (e) {}
      }
      if (!columnExists("documents", "reviewed_by")) {
        try { db.exec("ALTER TABLE documents ADD COLUMN reviewed_by TEXT"); } catch (e) {}
      }
      if (!columnExists("documents", "reviewed_at")) {
        try { db.exec("ALTER TABLE documents ADD COLUMN reviewed_at TEXT"); } catch (e) {}
      }
      if (!columnExists("documents", "review_note")) {
        try { db.exec("ALTER TABLE documents ADD COLUMN review_note TEXT"); } catch (e) {}
      }
      try { db.exec("UPDATE documents SET approval_status = 'Approved' WHERE approval_status IS NULL OR approval_status = ''"); } catch (e) {}
      try { db.exec("CREATE INDEX IF NOT EXISTS idx_documents_approval_status ON documents(approval_status)"); } catch (e) {}
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '2')").run();
    }

    if (schemaVersion < 3) {
      if (!columnExists("sections", "course_code")) {
        try { db.exec("ALTER TABLE sections ADD COLUMN course_code TEXT"); } catch (e) {}
      }
      try {
        db.exec(`
          UPDATE sections
          SET course_code = (
            SELECT s.course_code
            FROM students s
            WHERE s.section = sections.name
            LIMIT 1
          )
          WHERE course_code IS NULL OR course_code = ''
        `);
      } catch (e) {}
      try { db.exec("CREATE INDEX IF NOT EXISTS idx_sections_course_code ON sections(course_code)"); } catch (e) {}
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '3')").run();
    }

    if (schemaVersion < 4) {
      try {
        db.exec("PRAGMA foreign_keys = OFF");
        db.exec(`
          BEGIN;

          UPDATE students
          SET
            course_code = UPPER(TRIM(COALESCE(course_code, ''))),
            section = TRIM(COALESCE(section, ''));

          UPDATE documents
          SET
            student_no = TRIM(COALESCE(student_no, '')),
            doc_type = TRIM(COALESCE(doc_type, '')),
            reviewed_by = NULLIF(TRIM(COALESCE(reviewed_by, '')), '');

          INSERT OR IGNORE INTO courses(code, name)
          SELECT DISTINCT UPPER(TRIM(course_code)), UPPER(TRIM(course_code))
          FROM students
          WHERE TRIM(COALESCE(course_code, '')) <> '';

          INSERT OR IGNORE INTO courses(code, name)
          SELECT 'UNKN', 'Unknown'
          WHERE EXISTS (
            SELECT 1 FROM students
            WHERE TRIM(COALESCE(course_code, '')) = ''
          );

          INSERT OR IGNORE INTO sections(name, course_code)
          SELECT 'UNASSIGNED', 'UNKN'
          WHERE EXISTS (
            SELECT 1 FROM students
            WHERE TRIM(COALESCE(section, '')) = ''
          );

          UPDATE students
          SET course_code = 'UNKN'
          WHERE TRIM(COALESCE(course_code, '')) = '';

          UPDATE students
          SET section = 'UNASSIGNED'
          WHERE TRIM(COALESCE(section, '')) = '';

          INSERT OR IGNORE INTO sections(name, course_code)
          SELECT DISTINCT
            TRIM(section),
            CASE
              WHEN TRIM(COALESCE(course_code, '')) = '' THEN 'UNKN'
              ELSE UPPER(TRIM(course_code))
            END
          FROM students
          WHERE TRIM(COALESCE(section, '')) <> '';

          UPDATE sections
          SET course_code = NULL
          WHERE TRIM(COALESCE(course_code, '')) <> ''
            AND NOT EXISTS (
              SELECT 1 FROM courses c WHERE c.code = sections.course_code
            );

          INSERT OR IGNORE INTO document_types(name, name_norm)
          SELECT DISTINCT
            TRIM(doc_type),
            lower(trim(doc_type))
          FROM documents
          WHERE TRIM(COALESCE(doc_type, '')) <> '';

          INSERT OR IGNORE INTO students (
            student_no, name, course_code, year_level, section, room, cabinet, drawer, status, created_at
          )
          SELECT DISTINCT
            d.student_no,
            COALESCE(NULLIF(TRIM(d.student_name), ''), 'UNKNOWN'),
            'UNKN',
            2000,
            'UNASSIGNED',
            1,
            'A',
            1,
            'Active',
            datetime('now')
          FROM documents d
          LEFT JOIN students s ON s.student_no = d.student_no
          WHERE s.student_no IS NULL
            AND TRIM(COALESCE(d.student_no, '')) <> '';

          UPDATE documents
          SET reviewed_by = NULL
          WHERE reviewed_by IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM staff st WHERE st.id = documents.reviewed_by);

          CREATE TABLE sections_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            course_code TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (course_code) REFERENCES courses(code) ON UPDATE CASCADE ON DELETE SET NULL
          );

          INSERT INTO sections_new (id, name, course_code, created_at)
          SELECT id, name, course_code, created_at FROM sections;

          DROP TABLE sections;
          ALTER TABLE sections_new RENAME TO sections;

          CREATE TABLE students_new (
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
            FOREIGN KEY (section) REFERENCES sections(name) ON UPDATE CASCADE ON DELETE RESTRICT
          );

          INSERT INTO students_new (
            student_no, name, course_code, year_level, section, room, cabinet, drawer, status, created_at
          )
          SELECT
            student_no, name, course_code, year_level, section, room, cabinet, drawer, status, created_at
          FROM students;

          DROP TABLE students;
          ALTER TABLE students_new RENAME TO students;

          CREATE TABLE documents_new (
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
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (student_no) REFERENCES students(student_no) ON UPDATE CASCADE ON DELETE RESTRICT,
            FOREIGN KEY (doc_type) REFERENCES document_types(name) ON UPDATE CASCADE ON DELETE RESTRICT,
            FOREIGN KEY (reviewed_by) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE SET NULL,
            FOREIGN KEY (uploaded_by) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE SET NULL
          );

          INSERT INTO documents_new (
            id, student_no, student_name, doc_type, original_filename, storage_filename,
            mime_type, size_bytes, approval_status, reviewed_by, reviewed_at, review_note, uploaded_by, created_at
          )
          SELECT
            id, student_no, student_name, doc_type, original_filename, storage_filename,
            mime_type, size_bytes, approval_status, reviewed_by, reviewed_at, review_note, uploaded_by, created_at
          FROM documents;

          DROP TABLE documents;
          ALTER TABLE documents_new RENAME TO documents;

          CREATE INDEX IF NOT EXISTS idx_documents_student_no ON documents(student_no);
          CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
          CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
          CREATE INDEX IF NOT EXISTS idx_documents_approval_status ON documents(approval_status);
          CREATE INDEX IF NOT EXISTS idx_document_types_name ON document_types(name);
          CREATE INDEX IF NOT EXISTS idx_document_types_name_norm ON document_types(name_norm);
          CREATE INDEX IF NOT EXISTS idx_students_course_year_section ON students(course_code, year_level, section);
          CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
          CREATE INDEX IF NOT EXISTS idx_sections_course_code ON sections(course_code);

          INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '4');
          COMMIT;
        `);
      } catch (e) {
        try { db.exec("ROLLBACK"); } catch (_) {}
        throw e;
      } finally {
        try { db.exec("PRAGMA foreign_keys = ON"); } catch (_) {}
      }
    }

    if (schemaVersion < 5) {
      ensureDocumentRequestsTable();
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '5')").run();
    }

    if (schemaVersion < 6) {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS security_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            is_required INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          CREATE TABLE IF NOT EXISTS staff_security_answers (
            staff_id TEXT NOT NULL,
            question_id INTEGER NOT NULL,
            answer_hash TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (staff_id, question_id),
            FOREIGN KEY (staff_id) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE,
            FOREIGN KEY (question_id) REFERENCES security_questions(id) ON UPDATE CASCADE ON DELETE CASCADE
          );
        `);
        const defaultQs = [
          "What was the name of your first pet?",
          "What is your mother's maiden name?",
          "What high school did you attend?",
          "What is the name of the street you grew up on?",
          "What was your childhood nickname?"
        ];
        for (const q of defaultQs) {
          db.prepare("INSERT OR IGNORE INTO security_questions (question, is_required) VALUES (?, 0)").run(q);
        }
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '6')").run();
      } catch (e) {}
    }

    if (schemaVersion < 7) {
      try {
        db.exec("PRAGMA foreign_keys = OFF");
        db.exec(`
          BEGIN;
          CREATE TABLE staff_new (
            id TEXT PRIMARY KEY,
            fname TEXT NOT NULL,
            lname TEXT NOT NULL,
            role TEXT NOT NULL,
            section TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Active',
            email TEXT NOT NULL,
            last_active TEXT,
            password_hash TEXT,
            totp_secret TEXT,
            totp_enabled INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          INSERT INTO staff_new (id, fname, lname, role, section, status, email, last_active, password_hash, totp_secret, totp_enabled, created_at, updated_at)
          SELECT id, fname, lname, role, section, status, email, last_active, password_hash, NULL, 0, created_at, updated_at FROM staff;
          DROP TABLE staff;
          ALTER TABLE staff_new RENAME TO staff;
          CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(lname, fname);
          CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
          CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
          INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '7');
          COMMIT;
        `);
      } catch (e) {
        try { db.exec("ROLLBACK"); } catch (_) {}
      } finally {
        try { db.exec("PRAGMA foreign_keys = ON"); } catch (_) {}
      }
    }

    if (schemaVersion < 8) {
      ensureIngestQueueTable();
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '8')").run();
    }

    if (schemaVersion < 9) {
      try {
        db.exec("PRAGMA foreign_keys = OFF");
        db.exec(`
          BEGIN;

          CREATE TABLE sections_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            course_code TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(name, course_code),
            FOREIGN KEY (course_code) REFERENCES courses(code) ON UPDATE CASCADE ON DELETE SET NULL
          );

          INSERT INTO sections_new (id, name, course_code, created_at)
          SELECT id, name, COALESCE(course_code, 'UNKN'), created_at FROM sections;

          DROP TABLE sections;
          ALTER TABLE sections_new RENAME TO sections;
          CREATE INDEX IF NOT EXISTS idx_sections_course_code ON sections(course_code);

          CREATE TABLE students_new (
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

          INSERT INTO students_new (
            student_no, name, course_code, year_level, section, room, cabinet, drawer, status, created_at
          )
          SELECT
            student_no, name, course_code, year_level, section, room, cabinet, drawer, status, created_at
          FROM students;

          DROP TABLE students;
          ALTER TABLE students_new RENAME TO students;
          CREATE INDEX IF NOT EXISTS idx_students_course_year_section ON students(course_code, year_level, section);
          CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);

          INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '9');
          COMMIT;
        `);
      } catch (e) {
        try { db.exec("ROLLBACK"); } catch (_) {}
        console.error("[DB] schema_version 9 migration:", e);
      } finally {
        try { db.exec("PRAGMA foreign_keys = ON"); } catch (_) {}
      }
    }

    if (schemaVersion < 10) {
      try {
        if (!columnExists("staff", "totp_secret")) {
          db.exec("ALTER TABLE staff ADD COLUMN totp_secret TEXT");
        }
        if (!columnExists("staff", "totp_enabled")) {
          db.exec("ALTER TABLE staff ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0");
        }
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '10')").run();
      } catch (e) {
        console.error("[DB] schema_version 10 migration (TOTP):", e);
      }
    }

    if (schemaVersion < 11) {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS rate_limits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            endpoint_type TEXT NOT NULL,
            identifier TEXT NOT NULL,
            window_seconds INTEGER NOT NULL,
            max_requests INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(endpoint_type, identifier)
          );

          CREATE TABLE IF NOT EXISTS rate_limit_hits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            endpoint_type TEXT NOT NULL,
            identifier TEXT NOT NULL,
            ip_address TEXT,
            user_id TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );

          CREATE TABLE IF NOT EXISTS rate_limit_violations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            endpoint_type TEXT NOT NULL,
            identifier TEXT NOT NULL,
            ip_address TEXT,
            user_id TEXT,
            violation_count INTEGER NOT NULL DEFAULT 1,
            lockout_until TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );

          CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint_type ON rate_limits(endpoint_type);
          CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_endpoint_identifier_created ON rate_limit_hits(endpoint_type, identifier, created_at);
          CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_created_at ON rate_limit_hits(created_at);
          CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_endpoint_identifier ON rate_limit_violations(endpoint_type, identifier);
          CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_lockout_until ON rate_limit_violations(lockout_until);
        `);

        db.exec(`
          INSERT OR IGNORE INTO rate_limits (endpoint_type, identifier, window_seconds, max_requests) VALUES
          ('auth_login', 'default', 900, 5),
          ('auth_forgot_password', 'default', 3600, 3),
          ('api_general', 'default', 60, 100),
          ('api_sensitive', 'default', 60, 20),
          ('file_upload', 'default', 60, 10);
        `);

        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '11')").run();
      } catch (e) {
        console.error("[DB] schema_version 11 migration (rate limiting):", e);
      }
    }

    if (schemaVersion < 12) {
      try {
        db.exec("PRAGMA foreign_keys = OFF");
        db.exec("BEGIN");
        
        if (!columnExists("courses", "status")) {
          db.exec("ALTER TABLE courses ADD COLUMN status TEXT NOT NULL DEFAULT 'Active'");
        }
        if (!columnExists("sections", "status")) {
          db.exec("ALTER TABLE sections ADD COLUMN status TEXT NOT NULL DEFAULT 'Active'");
        }
        if (!columnExists("document_types", "status")) {
          db.exec("ALTER TABLE document_types ADD COLUMN status TEXT NOT NULL DEFAULT 'Active'");
        }

        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '12')").run();
        db.exec("COMMIT");
      } catch (e) {
        try { db.exec("ROLLBACK"); } catch (_) {}
        console.error("[DB] schema_version 12 migration (taxonomy status):", e);
      } finally {
        try { db.exec("PRAGMA foreign_keys = ON"); } catch (_) {}
      }
    }

    // Safety nets
    try {
      if (!columnExists("documents", "approval_status")) {
        db.exec("ALTER TABLE documents ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'Pending'");
      }
      if (!columnExists("documents", "reviewed_by")) {
        db.exec("ALTER TABLE documents ADD COLUMN reviewed_by TEXT");
      }
      if (!columnExists("documents", "reviewed_at")) {
        db.exec("ALTER TABLE documents ADD COLUMN reviewed_at TEXT");
      }
      if (!columnExists("documents", "review_note")) {
        db.exec("ALTER TABLE documents ADD COLUMN review_note TEXT");
      }
      db.exec("UPDATE documents SET approval_status = 'Approved' WHERE approval_status IS NULL OR approval_status = ''");
      db.exec("CREATE INDEX IF NOT EXISTS idx_documents_approval_status ON documents(approval_status)");
    } catch (e) {}

    try {
      if (!columnExists("sections", "course_code")) {
        db.exec("ALTER TABLE sections ADD COLUMN course_code TEXT");
      }
      if (!columnExists("sections", "status")) {
        db.exec("ALTER TABLE sections ADD COLUMN status TEXT NOT NULL DEFAULT 'Active'");
      }
      db.exec("CREATE INDEX IF NOT EXISTS idx_sections_course_code ON sections(course_code)");
    } catch (e) {}

    try {
      if (!columnExists("courses", "status")) {
        db.exec("ALTER TABLE courses ADD COLUMN status TEXT NOT NULL DEFAULT 'Active'");
      }
    } catch (e) {}

    try {
      if (!columnExists("document_types", "status")) {
        db.exec("ALTER TABLE document_types ADD COLUMN status TEXT NOT NULL DEFAULT 'Active'");
      }
    } catch (e) {}

    if (schemaVersion < 13) {
      try {
        if (!columnExists("audit_logs", "details")) {
          db.exec("ALTER TABLE audit_logs ADD COLUMN details TEXT");
        }
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '13')").run();
      } catch (e) {
        console.error("[DB] schema_version 13 migration (audit_logs details):", e);
      }
    }

    if (schemaVersion < 14) {
      try {
        if (!columnExists("security_questions", "is_required")) {
          db.exec("ALTER TABLE security_questions ADD COLUMN is_required INTEGER NOT NULL DEFAULT 0");
        }
        
        const qRows = db.prepare("SELECT id FROM security_questions ORDER BY id ASC LIMIT 2").all();
        for (const qr of qRows) {
          db.prepare("UPDATE security_questions SET is_required = 1 WHERE id = ?").run(qr.id);
        }

        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '14')").run();
      } catch (e) {
        console.error("[DB] schema_version 14 migration (security_questions is_required):", e);
      }
    }

    if (schemaVersion < 15) {
      try {
        db.exec("PRAGMA foreign_keys = OFF");
        db.exec("BEGIN");
        
        if (!columnExists("audit_logs", "severity")) {
          db.exec("ALTER TABLE audit_logs ADD COLUMN severity TEXT NOT NULL DEFAULT 'INFO'");
        }
        if (!columnExists("audit_logs", "user_agent")) {
          db.exec("ALTER TABLE audit_logs ADD COLUMN user_agent TEXT");
        }
        if (!columnExists("audit_logs", "entity_type")) {
          db.exec("ALTER TABLE audit_logs ADD COLUMN entity_type TEXT");
        }
        if (!columnExists("audit_logs", "entity_id")) {
          db.exec("ALTER TABLE audit_logs ADD COLUMN entity_id TEXT");
        }

        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '15')").run();
        db.exec("COMMIT");
      } catch (e) {
        try { db.exec("ROLLBACK"); } catch (_) {}
        console.error("[DB] schema_version 15 migration (audit_logs enhancement):", e);
      } finally {
        try { db.exec("PRAGMA foreign_keys = ON"); } catch (_) {}
      }
    }

    if (schemaVersion < 16) {
      try {
        if (!columnExists("staff", "password_last_changed")) {
          db.exec("ALTER TABLE staff ADD COLUMN password_last_changed TEXT");
          db.exec("UPDATE staff SET password_last_changed = created_at WHERE password_last_changed IS NULL");
        }
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '16')").run();
      } catch (e) {
        console.error("[DB] schema_version 16 migration (password_last_changed):", e);
      }
    }

    if (schemaVersion < 17) {
      ensureRecoveryCodesTable();
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '17')").run();
    }

    if (schemaVersion < 18) {
      try {
        if (!columnExists("staff", "serial_key_hash")) {
          db.exec("ALTER TABLE staff ADD COLUMN serial_key_hash TEXT");
        }
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '18')").run();
      } catch (e) {
        console.error("[DB] schema_version 18 migration (serial_key_hash):", e);
      }
    }

    if (schemaVersion < 19) {
      try {
        db.exec("CREATE INDEX IF NOT EXISTS idx_students_status ON students(status)");
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '19')").run();
      } catch (e) {
        console.error("[DB] schema_version 19 migration (students status index):", e);
      }
    }

    if (schemaVersion < 20) {
      try {
        if (!columnExists("staff", "preferences")) {
          db.exec("ALTER TABLE staff ADD COLUMN preferences TEXT DEFAULT '{}'");
        }
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '20')").run();
      } catch (e) {
        console.error("[DB] schema_version 20 migration (staff preferences):", e);
      }
    }

    ensureDocumentRequestsTable();
    ensureIngestQueueTable();
    ensureStaffNotificationStateTable();
    ensureRecoveryCodesTable();
    ensureSerialKeyColumn();
    ensureBirthCertificateDocType();
    ensureScanSessionTables();
    ensureStaffPreferencesColumn();

    return db;
  } catch (err) {
    db = null;
    global.sqliteDb = null;
    throw err;
  }
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

function ensureBirthCertificateDocType() {
  if (!db) return;
  try {
    db.prepare("INSERT OR IGNORE INTO document_types (name, name_norm) VALUES ('Birth Certificate', 'birth certificate')").run();
  } catch (e) {
    console.error("[DB] ensureBirthCertificateDocType:", e);
  }
}

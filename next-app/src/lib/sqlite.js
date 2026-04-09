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

/** Ensures document_requests exists (migrations only run on first DB init; HMR/cache skips them). */
function ensureDocumentRequestsTable() {
  if (!db) return;
  try {
    const check = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='document_requests'"
    );
    if (check?.[0]?.values?.length > 0) return;

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
      const ver = db.exec("SELECT value FROM settings WHERE key = 'schema_version'");
      const v =
        ver?.[0]?.values?.[0]?.[0] != null
          ? parseInt(String(ver[0].values[0][0]), 10)
          : 0;
      if (!Number.isFinite(v) || v < 5) {
        db.exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '5')");
      }
    } catch {
      // ignore
    }
    persistDb();
  } catch (e) {
    console.error("[DB] ensureDocumentRequestsTable:", e);
  }
}

function ensureIngestQueueTable() {
  if (!db) return;
  try {
    const check = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='ingest_queue'"
    );
    if (check?.[0]?.values?.length > 0) return;
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
      const ver = db.exec("SELECT value FROM settings WHERE key = 'schema_version'");
      const v =
        ver?.[0]?.values?.[0]?.[0] != null
          ? parseInt(String(ver[0].values[0][0]), 10)
          : 0;
      if (!Number.isFinite(v) || v < 8) {
        db.exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '8')");
      }
    } catch {}
    persistDb();
  } catch (e) {
    console.error("[DB] ensureIngestQueueTable:", e);
  }
}

function ensureStaffNotificationStateTable() {
  if (!db) return;
  try {
    const check = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='staff_notification_state'"
    );
    if (check?.[0]?.values?.length > 0) return;
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
    persistDb();
  } catch (e) {
    console.error("[DB] ensureStaffNotificationStateTable:", e);
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
  if (db) {
    ensureDocumentRequestsTable();
    ensureIngestQueueTable();
    ensureStaffNotificationStateTable();
    return db;
  }
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
      db.exec("PRAGMA foreign_keys = ON");

      // ... rest of schema setup ...

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
          approval_status TEXT NOT NULL DEFAULT 'Pending',
          reviewed_by TEXT,
          reviewed_at TEXT,
          review_note TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (student_no) REFERENCES students(student_no) ON UPDATE CASCADE ON DELETE RESTRICT,
          FOREIGN KEY (doc_type) REFERENCES document_types(name) ON UPDATE CASCADE ON DELETE RESTRICT,
          FOREIGN KEY (reviewed_by) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE SET NULL
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
          course_code TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
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
          FOREIGN KEY (section) REFERENCES sections(name) ON UPDATE CASCADE ON DELETE RESTRICT
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

        CREATE TABLE IF NOT EXISTS security_questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question TEXT NOT NULL,
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

        db.exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '1')");
        persistDb();
      }

      if (schemaVersion < 2) {
        try { db.exec("ALTER TABLE documents ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'Pending'"); } catch (e) {}
        try { db.exec("ALTER TABLE documents ADD COLUMN reviewed_by TEXT"); } catch (e) {}
        try { db.exec("ALTER TABLE documents ADD COLUMN reviewed_at TEXT"); } catch (e) {}
        try { db.exec("ALTER TABLE documents ADD COLUMN review_note TEXT"); } catch (e) {}
        try { db.exec("UPDATE documents SET approval_status = 'Approved' WHERE approval_status IS NULL OR approval_status = ''"); } catch (e) {}
        try { db.exec("CREATE INDEX IF NOT EXISTS idx_documents_approval_status ON documents(approval_status)"); } catch (e) {}
        db.exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '2')");
        persistDb();
      }

      if (schemaVersion < 3) {
        try { db.exec("ALTER TABLE sections ADD COLUMN course_code TEXT"); } catch (e) {}
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
        db.exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '3')");
        persistDb();
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

            -- Only create placeholder taxonomy rows if legacy student rows need them.
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
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              FOREIGN KEY (student_no) REFERENCES students(student_no) ON UPDATE CASCADE ON DELETE RESTRICT,
              FOREIGN KEY (doc_type) REFERENCES document_types(name) ON UPDATE CASCADE ON DELETE RESTRICT,
              FOREIGN KEY (reviewed_by) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE SET NULL
            );

            INSERT INTO documents_new (
              id, student_no, student_name, doc_type, original_filename, storage_filename,
              mime_type, size_bytes, approval_status, reviewed_by, reviewed_at, review_note, created_at
            )
            SELECT
              id, student_no, student_name, doc_type, original_filename, storage_filename,
              mime_type, size_bytes, approval_status, reviewed_by, reviewed_at, review_note, created_at
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
          persistDb();
        } catch (e) {
          try { db.exec("ROLLBACK"); } catch (_) {}
          throw e;
        } finally {
          try { db.exec("PRAGMA foreign_keys = ON"); } catch (_) {}
        }
      }

      if (schemaVersion < 5) {
        try {
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
          db.exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '5')");
          persistDb();
        } catch (e) {
          console.error("[DB] document_requests migration:", e);
        }
      }

      if (schemaVersion < 6) {
        try {
          db.exec(`
            CREATE TABLE IF NOT EXISTS security_questions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              question TEXT NOT NULL,
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
            db.exec(`INSERT OR IGNORE INTO security_questions (question) VALUES ('${q.replace(/'/g, "''")}')`);
          }
          db.exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '6')");
          persistDb();
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
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            INSERT INTO staff_new (id, fname, lname, role, section, status, email, last_active, password_hash, created_at, updated_at)
            SELECT id, fname, lname, role, section, status, email, last_active, password_hash, created_at, updated_at FROM staff;
            DROP TABLE staff;
            ALTER TABLE staff_new RENAME TO staff;
            CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(lname, fname);
            CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
            CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
            INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '7');
            COMMIT;
          `);
          persistDb();
        } catch (e) {
          try { db.exec("ROLLBACK"); } catch (_) {}
        } finally {
          try { db.exec("PRAGMA foreign_keys = ON"); } catch (_) {}
        }
      }

      if (schemaVersion < 8) {
        try {
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
          db.exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '8')");
          persistDb();
        } catch (e) {
          console.error("[DB] ingest_queue migration:", e);
        }
      }

      // Safety net for environments where schema_version may be out of sync.
      // This ensures review columns exist before any API query references them.
      try {
        const pragma = db.exec("PRAGMA table_info(documents)");
        const cols = new Set(
          (pragma?.[0]?.values || []).map((r) => String(r?.[1] || ""))
        );
        if (!cols.has("approval_status")) {
          db.exec("ALTER TABLE documents ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'Pending'");
        }
        if (!cols.has("reviewed_by")) {
          db.exec("ALTER TABLE documents ADD COLUMN reviewed_by TEXT");
        }
        if (!cols.has("reviewed_at")) {
          db.exec("ALTER TABLE documents ADD COLUMN reviewed_at TEXT");
        }
        if (!cols.has("review_note")) {
          db.exec("ALTER TABLE documents ADD COLUMN review_note TEXT");
        }
        db.exec("UPDATE documents SET approval_status = 'Approved' WHERE approval_status IS NULL OR approval_status = ''");
        db.exec("CREATE INDEX IF NOT EXISTS idx_documents_approval_status ON documents(approval_status)");
        persistDb();
      } catch (e) {
        // ignore schema safety-net errors
      }

      try {
        const pragma = db.exec("PRAGMA table_info(sections)");
        const cols = new Set(
          (pragma?.[0]?.values || []).map((r) => String(r?.[1] || ""))
        );
        if (!cols.has("course_code")) {
          db.exec("ALTER TABLE sections ADD COLUMN course_code TEXT");
        }
        db.exec("CREATE INDEX IF NOT EXISTS idx_sections_course_code ON sections(course_code)");
        persistDb();
      } catch (e) {
        // ignore sections safety-net errors
      }

      try {
        db.exec("PRAGMA foreign_keys = ON");
      } catch (e) {
        // ignore foreign key pragma errors
      }

      ensureDocumentRequestsTable();
      ensureIngestQueueTable();
      ensureStaffNotificationStateTable();

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

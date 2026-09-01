/**
 * System Database Connection Manager
 * 
 * Manages the global system.sqlite database that stores:
 * - Office registry (offices table)
 * - Module registry (modules table)
 * - Office-module assignments (office_modules table)
 * - Staff accounts (global, office-scoped via office_id)
 * - Security questions, answers, recovery codes
 * - Global audit logs
 * - Global settings
 * - Rate limits (global)
 * - Chat messages (global)
 */
import crypto from "node:crypto";
import { query, queryOne, withTransaction } from "./postgres.js";
import { postgresSql } from "./postgresCompat.js";

let systemDb = global.__systemDb || null;

function normalize(sql, params = []) {
  return [postgresSql(sql), Array.isArray(params) ? params : [params]];
}

/**
 * Default module registry — all possible modules in the system.
 * Each module maps to a React component/tab in the admin or staff pages.
 */
export const MODULE_REGISTRY = [
  // Admin modules
  {
    id: "records_review",
    name: "Records Review",
    description: "Approve or decline uploaded documents",
    category: "admin",
    icon: "ph-bold ph-seal-check",
    sidebar_group: "Operations & Analytics",
    sort_order: 1,
    is_system: 0,
    component_key: "DigitalRecordsReviewTab",
  },
  {
    id: "compliance_analytics",
    name: "Compliance",
    description: "Digitization compliance metrics dashboard",
    category: "admin",
    icon: "ph-bold ph-chart-bar",
    sidebar_group: "Operations & Analytics",
    sort_order: 2,
    is_system: 0,
    component_key: "DigitizationComplianceTab",
  },
  {
    id: "request_analytics",
    name: "Request Analytics",
    description: "SLA analytics for document requests",
    category: "admin",
    icon: "ph-bold ph-trend-up",
    sidebar_group: "Operations & Analytics",
    sort_order: 3,
    is_system: 0,
    component_key: "SLAAnalyticsTab",
  },
  {
    id: "staff_directory",
    name: "Staff Directory",
    description: "Manage office staff accounts",
    category: "admin",
    icon: "ph-bold ph-users",
    sidebar_group: "User Management",
    sort_order: 4,
    is_system: 0,
    component_key: "StaffDirectoryTab",
  },
  {
    id: "storage_layout",
    name: "Storage Layout",
    description: "Physical room/cabinet/drawer storage editor",
    category: "admin",
    icon: "ph-bold ph-warehouse",
    sidebar_group: "System Configuration",
    sort_order: 5,
    is_system: 0,
    component_key: "StorageLayoutEditorTab",
  },
  {
    id: "system_config",
    name: "System Config",
    description: "Configure courses, sections, and document types",
    category: "admin",
    icon: "ph-bold ph-gear",
    sidebar_group: "System Configuration",
    sort_order: 6,
    is_system: 0,
    component_key: "SystemConfigTab",
  },
  {
    id: "backup",
    name: "Backup & Restore",
    description: "Database backup and restore operations",
    category: "admin",
    icon: "ph-bold ph-database-backup",
    sidebar_group: "System Configuration",
    sort_order: 7,
    is_system: 0,
    component_key: "BackupTab",
  },
  {
    id: "audit_logs",
    name: "Audit Log",
    description: "Activity audit trail with search and export",
    category: "admin",
    icon: "ti ti-history",
    sidebar_group: "System Configuration",
    sort_order: 8,
    is_system: 1, // Cannot be disabled
    component_key: "AuditLogsTab",
  },

  // Staff modules
  {
    id: "alumni_requests",
    name: "Alumni Requests",
    description: "Staff-mediated alumni document request management",
    category: "staff",
    icon: "ph-bold ph-tray-arrow-up",
    sidebar_group: "Operations",
    sort_order: 1,
    is_system: 0,
    component_key: "DocumentRequestsTab",
  },
  {
    id: "scan_upload",
    name: "Scan & Upload",
    description: "Scan and upload documents with OCR",
    category: "staff",
    icon: "ph-bold ph-scan",
    sidebar_group: "Operations",
    sort_order: 2,
    is_system: 0,
    component_key: "ScanUploadTab",
  },
  {
    id: "documents",
    name: "Documents",
    description: "Student document matrix view and management",
    category: "staff",
    icon: "ph-bold ph-file-text",
    sidebar_group: "Operations",
    sort_order: 3,
    is_system: 0,
    component_key: "DocumentsTab",
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "Staff notification center",
    category: "staff",
    icon: "ph-bold ph-bell",
    sidebar_group: "Operations",
    sort_order: 4,
    is_system: 1, // Cannot be disabled
    component_key: "NotificationsTab",
  },
  {
    id: "records_archive",
    name: "Records & Archive",
    description: "Physical records browser and search",
    category: "staff",
    icon: "ph-bold ph-archive-box",
    sidebar_group: "Records Archive",
    sort_order: 5,
    is_system: 0,
    component_key: "RecordsArchiveTab",
  },
  {
    id: "storage_explorer",
    name: "Storage Explorer",
    description: "Physical storage room explorer",
    category: "staff",
    icon: "ph-bold ph-folder-open",
    sidebar_group: "Records Archive",
    sort_order: 6,
    is_system: 0,
    component_key: "StorageExplorerTab",
  },
];

/**
 * Default office definitions
 */
export const DEFAULT_OFFICES = [
  {
    id: "registrar",
    name: "Office of the Registrar",
    short_name: "Registrar",
    description: "Manages student academic records, transcripts, and enrollment documents",
    icon: "ph-bold ph-certificate",
    accent_color: "#E5484D",
  },
  {
    id: "osas",
    name: "Office of Student Affairs and Services",
    short_name: "OSAS",
    description: "Manages student activities, organizations, clearances, and student affairs documents",
    icon: "ph-bold ph-student",
    accent_color: "#3B82F6",
  },
];

/**
 * Default module assignments per office
 */
export const DEFAULT_OFFICE_MODULES = {
  registrar: [
    // All modules enabled for Registrar
    "records_review", "compliance_analytics", "request_analytics",
    "staff_directory", "storage_layout", "system_config", "backup", "audit_logs",
    "alumni_requests", "scan_upload", "documents", "notifications",
    "records_archive", "storage_explorer",
  ],
  osas: [
    // OSAS modules — no storage/physical archive modules
    "records_review", "compliance_analytics",
    "staff_directory", "system_config", "backup", "audit_logs",
    "scan_upload", "documents", "notifications",
  ],
};

export const DEFAULT_SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What high school did you attend?",
  "What is the name of the street you grew up on?",
  "What was your childhood nickname?",
];


/**
 * Get or initialize the system database connection.
 * Creates the system.sqlite file and all tables on first call.
 */
export async function getSystemDb() {
  if (global.__systemMaintenanceMode) {
    throw new Error("System database is undergoing maintenance. Please try again in a moment.");
  }

  return { query, queryOne, withTransaction };
  /* legacy SQLite initialization retained below only as historical reference */
  try { /*
      CREATE TABLE IF NOT EXISTS offices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        short_name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        accent_color TEXT DEFAULT '#800000',
        db_filename TEXT DEFAULT 'db.sqlite',
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS modules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        icon TEXT,
        sidebar_group TEXT,
        sort_order INTEGER DEFAULT 0,
        is_system INTEGER DEFAULT 0,
        component_key TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS office_modules (
        office_id TEXT NOT NULL,
        module_id TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        config TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (office_id, module_id),
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        office_id TEXT,
        fname TEXT NOT NULL,
        lname TEXT NOT NULL,
        role TEXT NOT NULL,
        section TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        email TEXT NOT NULL UNIQUE,
        last_active TEXT,
        password_hash TEXT,
        password_last_changed TEXT,
        totp_secret TEXT,
        totp_enabled INTEGER NOT NULL DEFAULT 0,
        serial_key_hash TEXT,
        avatar_filename TEXT,
        preferences TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL
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

      CREATE TABLE IF NOT EXISTS staff_recovery_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS global_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        actor TEXT NOT NULL,
        role TEXT NOT NULL,
        office_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        severity TEXT NOT NULL DEFAULT 'INFO',
        user_agent TEXT,
        entity_type TEXT,
        entity_id TEXT,
        ip TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

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

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id TEXT NOT NULL,
        recipient_id TEXT,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        is_read INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        is_edited INTEGER DEFAULT 0,
        updated_at TEXT,
        original_message TEXT,
        image_filename TEXT,
        mime_type TEXT,
        FOREIGN KEY (sender_id) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS chat_message_deletions (
        message_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        PRIMARY KEY (message_id, user_id),
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES staff(id) ON UPDATE CASCADE ON DELETE CASCADE
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_staff_office_id ON staff(office_id);
      CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(lname, fname);
      CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
      CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
      CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
      CREATE INDEX IF NOT EXISTS idx_recovery_codes_staff_id ON staff_recovery_codes(staff_id);
      CREATE INDEX IF NOT EXISTS idx_global_audit_logs_created_at ON global_audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_global_audit_logs_office_id ON global_audit_logs(office_id);
      CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint_type ON rate_limits(endpoint_type);
      CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_endpoint_identifier_created ON rate_limit_hits(endpoint_type, identifier, created_at);
      CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_created_at ON rate_limit_hits(created_at);
      CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_endpoint_identifier ON rate_limit_violations(endpoint_type, identifier);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_recipient ON chat_messages(sender_id, recipient_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
    `);

    // ----- Seed defaults if first run -----
    await seedSystemDefaults(systemDb);

    return systemDb; */
  } catch (err) {
    systemDb = null;
    global.__systemDb = null;
    throw err;
  }
}

/**
 * Seeds default offices, modules, and office_modules if tables are empty.
 */
async function seedSystemDefaults(db) {
  // Seed offices
  const officeCount = db.prepare("SELECT COUNT(*) as count FROM offices").get();
  if (officeCount.count === 0) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO offices (id, name, short_name, description, icon, accent_color)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const o of DEFAULT_OFFICES) {
      stmt.run(o.id, o.name, o.short_name, o.description, o.icon, o.accent_color);
    }
    console.log("[SystemDB] Seeded default offices.");
  }

  // Seed module registry
  const moduleCount = db.prepare("SELECT COUNT(*) as count FROM modules").get();
  if (moduleCount.count === 0) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO modules (id, name, description, category, icon, sidebar_group, sort_order, is_system, component_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of MODULE_REGISTRY) {
      stmt.run(m.id, m.name, m.description, m.category, m.icon, m.sidebar_group, m.sort_order, m.is_system, m.component_key);
    }
    console.log("[SystemDB] Seeded module registry.");
  }

  // Seed office_modules
  const omCount = db.prepare("SELECT COUNT(*) as count FROM office_modules").get();
  if (omCount.count === 0) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO office_modules (office_id, module_id, enabled, sort_order)
      VALUES (?, ?, 1, ?)
    `);
    for (const [officeId, moduleIds] of Object.entries(DEFAULT_OFFICE_MODULES)) {
      for (let i = 0; i < moduleIds.length; i++) {
        stmt.run(officeId, moduleIds[i], i);
      }
    }
    console.log("[SystemDB] Seeded office-module assignments.");
  }

  // Seed security questions
  const sqCount = db.prepare("SELECT COUNT(*) as count FROM security_questions").get();
  if (sqCount.count === 0) {
    const stmt = db.prepare("INSERT INTO security_questions (question, is_required) VALUES (?, ?)");
    for (let i = 0; i < DEFAULT_SECURITY_QUESTIONS.length; i++) {
      stmt.run(DEFAULT_SECURITY_QUESTIONS[i], i < 2 ? 1 : 0);
    }
    console.log("[SystemDB] Seeded security questions.");
  }

  // Seed default SuperAdmin if no staff exist
  const staffCount = db.prepare("SELECT COUNT(*) as count FROM staff").get();
  if (staffCount.count === 0) {
    const defaultPassword = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
    const passwordHash = crypto.createHash("sha256").update(defaultPassword).digest("hex");

    db.prepare(`
      INSERT INTO staff (id, office_id, fname, lname, role, section, status, email, password_hash, password_last_changed)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      "PUPREGISTRAR-001",
      "Elias",
      "Austria",
      "SuperAdmin",
      "Administrative",
      "Active",
      "admin.default@pup.local",
      passwordHash
    );
    console.log("[SystemDB] Seeded default SuperAdmin account.");
  }

  // Seed rate limits
  const rlCount = db.prepare("SELECT COUNT(*) as count FROM rate_limits").get();
  if (rlCount.count === 0) {
    db.exec(`
      INSERT OR IGNORE INTO rate_limits (endpoint_type, identifier, window_seconds, max_requests) VALUES
      ('auth_login', 'default', 900, 5),
      ('auth_forgot_password', 'default', 3600, 3),
      ('api_general', 'default', 60, 100),
      ('api_sensitive', 'default', 60, 20),
      ('file_upload', 'default', 60, 10);
    `);
    console.log("[SystemDB] Seeded rate limit defaults.");
  }
}

/**
 * Helper: run a query and return all rows from the system database.
 */
export async function sysDbAll(sql, params) {
  const [text, values] = normalize(sql, params);
  return query(text, values);
}

/**
 * Helper: run a query and return a single row from the system database.
 */
export async function sysDbGet(sql, params) {
  const [text, values] = normalize(sql, params);
  return queryOne(text, values);
}

/**
 * Helper: run a write query on the system database.
 */
export async function sysDbRun(sql, params) {
  const [text, values] = normalize(sql, params);
  const rows = await query(`${text} RETURNING *`, values);
  return {
    changes: rows.length,
    lastInsertRowid: rows[0]?.id,
  };
}

/**
 * Reload the system database connection.
 */
export function reloadSystemDb() {
  systemDb = null;
  global.__systemDb = null;
  console.log("[SystemDB] Connection cache cleared for reload.");
}

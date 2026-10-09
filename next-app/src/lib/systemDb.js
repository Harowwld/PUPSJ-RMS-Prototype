/**
 * System Database Connection Manager
 * 
 * Legacy system-database facade. Active global data is stored in PostgreSQL;
 * the compatibility methods below preserve older call sites during cutover.
 * - Office registry (offices table)
 * - Module registry (modules table)
 * - Office-module assignments (office_modules table)
 * - Staff accounts (global, office-scoped via office_id)
 * - Security questions, answers, recovery codes
 * - Global audit logs
 * - Global settings
 * - Rate limits (global)
 */
import { query, queryOne, withTransaction } from "./postgres.js";
import { postgresSql } from "./postgresCompat.js";


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
    sidebar_group: "Records & Verification",
    sort_order: 1,
    is_system: 1, // Cannot be disabled
    component_key: "DigitalRecordsReviewTab",
  },
  {
    id: "compliance_analytics",
    name: "Compliance",
    description: "Digitization compliance metrics dashboard",
    category: "admin",
    icon: "ph-bold ph-chart-bar",
    sidebar_group: "Records & Verification",
    sort_order: 2,
    is_system: 1, // Cannot be disabled
    component_key: "DigitizationComplianceTab",
  },
  {
    id: "request_analytics",
    name: "Request Analytics",
    description: "SLA analytics for document requests",
    category: "admin",
    icon: "ph-bold ph-trend-up",
    sidebar_group: "Operations & Fulfillment",
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
    sidebar_group: "Personnel & Governance",
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
    sidebar_group: "Operations & Fulfillment",
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
    sidebar_group: "System & Maintenance",
    sort_order: 6,
    is_system: 0,
    component_key: "SystemConfigTab",
  },
  {
    id: "backup",
    name: "Backup & Restore",
    description: "Database backup and restore operations",
    category: "admin",
    icon: "ph-bold ph-cloud-arrow-up",
    sidebar_group: "System & Maintenance",
    sort_order: 7,
    is_system: 1, // Cannot be disabled
    component_key: "BackupTab",
  },
  {
    id: "audit_logs",
    name: "Audit Log",
    description: "Activity audit trail with search and export",
    category: "admin",
    icon: "ph-bold ph-history",
    sidebar_group: "Personnel & Governance",
    sort_order: 8,
    is_system: 1, // Cannot be disabled
    component_key: "AuditLogsTab",
  },

  // Staff modules
  {
    id: "document_requests",
    name: "Document Requests",
    description: "Online and staff-mediated document request management (ODRS)",
    category: "staff",
    icon: "ph-bold ph-tray-arrow-up",
    sidebar_group: "Service & Requests",
    sort_order: 1,
    is_system: 0,
    component_key: "DocumentRequestsTab",
  },
  {
    id: "osas_monitoring",
    name: "OSAS Monitoring",
    description: "Review student event proposals and requirements",
    category: "staff",
    icon: "ph-bold ph-student",
    sidebar_group: "Service & Requests",
    sort_order: 2,
    is_system: 0,
    component_key: "OsasMonitoringTab",
  },
  {
    id: "scan_upload",
    name: "Scan & Upload",
    description: "Scan and upload documents with OCR",
    category: "staff",
    icon: "ph-bold ph-scan",
    sidebar_group: "Digitization & Ingestion",
    sort_order: 3,
    is_system: 1, // Cannot be disabled
    component_key: "ScanUploadTab",
  },
  {
    id: "student_directory",
    name: "Student Directory",
    description: "Manage student master records, academic profiles, and physical archive assignments",
    category: "staff",
    icon: "ph-bold ph-users",
    sidebar_group: "Student & Organization Roster",
    sort_order: 4,
    is_system: 0,
    component_key: "StudentDirectoryTab",
  },
  {
    id: "student_organizations",
    name: "Student Organizations",
    description: "Manage recognized student organizations, Constitution & By-Laws (CBL), and officer whitelists",
    category: "staff",
    icon: "ph-bold ph-buildings",
    sidebar_group: "Student & Organization Roster",
    sort_order: 5,
    is_system: 0,
    component_key: "StudentOrganizationsTab",
  },
  {
    id: "records_archive",
    name: "Records & Archive",
    description: "Physical records browser and search",
    category: "staff",
    icon: "ph-bold ph-archive-box",
    sidebar_group: "Archive & Storage",
    sort_order: 6,
    is_system: 0,
    component_key: "RecordsArchiveTab",
  },
  {
    id: "storage_explorer",
    name: "Storage Explorer",
    description: "Physical storage room explorer",
    category: "staff",
    icon: "ph-bold ph-folder-open",
    sidebar_group: "Archive & Storage",
    sort_order: 7,
    is_system: 0,
    component_key: "StorageExplorerTab",
  },
  {
    id: "documents",
    name: "Documents",
    description: "Student document matrix view and management",
    category: "staff",
    icon: "ph-bold ph-file-text",
    sidebar_group: "Records & Communications",
    sort_order: 8,
    is_system: 1, // Cannot be disabled
    component_key: "DocumentsTab",
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "Staff notification center",
    category: "staff",
    icon: "ph-bold ph-bell",
    sidebar_group: "Records & Communications",
    sort_order: 9,
    is_system: 1, // Cannot be disabled
    component_key: "NotificationsTab",
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
    accent_color: "#ff9b11",
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
    "document_requests", "student_directory", "scan_upload", "documents", "notifications",
    "records_archive", "storage_explorer",
  ],
  osas: [
    // OSAS modules — operations, digitization, and physical/digital storage suite
    "records_review", "compliance_analytics",
    "staff_directory", "storage_layout", "system_config", "backup", "audit_logs",
    "osas_monitoring", "student_organizations", "scan_upload", "documents", "notifications",
    "records_archive", "storage_explorer",
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
  global.__systemDb = null;
  console.log("[SystemDB] Connection cache cleared for reload.");
}

# Multi-Office Architecture — Revised Plan (v2)

Extending PUPSJ-RMS from a single-office (Registrar) system to a fully multi-tenant platform with separate databases per office, a dedicated SuperAdmin, and dynamic module configuration.

---

## Architecture: Full Multi-Tenancy (Separate Databases)

Based on your feedback, the architecture is:

- **Completely isolated offices** — different databases, different entities, different transactions
- **Shared concept only**: the digitalization workflow (scan, upload, review) — but with different documents
- **Per-office backup** — trivially backing up each office's `.sqlite` file
- **Dedicated `/superadmin`** — platform-level control panel

### Database Layout

```
.local/
├── system.sqlite              ← Global: offices, modules, staff accounts, SuperAdmin config
├── registrar/
│   ├── db.sqlite              ← Registrar-specific data (students, documents, etc.)
│   ├── uploads/               ← Registrar document files
│   └── backups/               ← Registrar backups
├── osas/
│   ├── db.sqlite              ← OSAS-specific data (orgs, clearances, events, etc.)
│   ├── uploads/               ← OSAS document files
│   └── backups/               ← OSAS backups
└── [future-office]/
    ├── db.sqlite
    ├── uploads/
    └── backups/
```

> [!TIP]
> **Backup is now trivial**: To backup the Registrar office, just copy `.local/registrar/`. To backup OSAS, copy `.local/osas/`. The SuperAdmin can backup the system DB separately. No SQL filtering needed.

---

## System Database Schema (`system.sqlite`)

This is the **global** database — shared across all offices. It contains:

```sql
-- Office registry
CREATE TABLE IF NOT EXISTS offices (
  id TEXT PRIMARY KEY,                -- e.g., 'registrar', 'osas'
  name TEXT NOT NULL,                 -- e.g., 'Office of the Registrar'
  short_name TEXT NOT NULL,           -- e.g., 'Registrar'
  description TEXT,
  icon TEXT,                          -- Icon class for sidebar/branding
  accent_color TEXT DEFAULT '#800000',-- Office theme accent color
  db_filename TEXT DEFAULT 'db.sqlite',
  status TEXT NOT NULL DEFAULT 'Active',  -- Active / Inactive
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Module registry (master list of ALL possible modules)
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,                -- e.g., 'records_review', 'storage_layout'
  name TEXT NOT NULL,                 -- Display name: 'Records Review'
  description TEXT,                   -- What this module does
  category TEXT NOT NULL,             -- 'admin' | 'staff'
  icon TEXT,                          -- Icon class
  sidebar_group TEXT,                 -- Sidebar header group: 'Operations & Analytics'
  sort_order INTEGER DEFAULT 0,
  is_system INTEGER DEFAULT 0,       -- 1 = always enabled (e.g., audit_logs)
  component_key TEXT NOT NULL,        -- Maps to React component: 'StorageLayoutEditorTab'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Which modules are enabled for which office
CREATE TABLE IF NOT EXISTS office_modules (
  office_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  config TEXT,                        -- JSON: office-specific module config
  sort_order INTEGER DEFAULT 0,       -- Office can reorder modules
  PRIMARY KEY (office_id, module_id),
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

-- Staff accounts (GLOBAL — staff belong to an office)
-- Moved from per-office DB to system DB so login works globally
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  office_id TEXT,                     -- NULL for SuperAdmin (global)
  fname TEXT NOT NULL,
  lname TEXT NOT NULL,
  role TEXT NOT NULL,                 -- 'SuperAdmin' | 'Admin' | 'Staff'
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
  preferences TEXT,                   -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL
);

-- Security questions & answers (global)
CREATE TABLE IF NOT EXISTS security_questions (...);   -- Same as current
CREATE TABLE IF NOT EXISTS staff_security_answers (...); -- Same as current
CREATE TABLE IF NOT EXISTS staff_recovery_codes (...);   -- Same as current

-- Global audit logs (SuperAdmin actions + cross-office events)
CREATE TABLE IF NOT EXISTS global_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  office_id TEXT,                     -- Which office context (NULL = global)
  action TEXT NOT NULL,
  details TEXT,
  severity TEXT NOT NULL DEFAULT 'INFO',
  ip TEXT
);

-- Settings (global system config)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## Per-Office Database Template

Each office gets its **own database** with tables relevant to that office. The Registrar keeps its current schema. OSAS gets a different schema.

### Registrar Office (`registrar/db.sqlite`) — Current Schema

Stays essentially the same, minus the `staff` table (moved to system DB):

```sql
-- These stay in the Registrar's own database:
students (...)           -- Same as current
documents (...)          -- Same as current
document_types (...)     -- Same as current
courses (...)            -- Same as current  
sections (...)           -- Same as current
document_requests (...)  -- Same as current
audit_logs (...)         -- Office-specific audit trail
backups (...)            -- Office-specific backup registry
settings (...)           -- Office-specific settings
storage_layout           -- Via settings JSON (Registrar-only feature)
-- Scan sessions, notifications, ingest queue — same as current
```

### OSAS Office (`osas/db.sqlite`) — New Schema

OSAS manages student affairs materials — completely different entities:

```sql
-- OSAS-specific document types
CREATE TABLE IF NOT EXISTS document_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  name_norm TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- OSAS may track students differently or reference by student_no
-- (but the student data lives here, isolated from Registrar)
CREATE TABLE IF NOT EXISTS students (
  student_no TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  course_code TEXT,
  year_level INTEGER,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
  -- NOTE: No room/cabinet/drawer — OSAS has no storage room
);

-- OSAS documents (same shape as Registrar, different content)
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
  reviewed_by TEXT,          -- References staff.id in system.sqlite
  reviewed_at TEXT,
  review_note TEXT,
  uploaded_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_no) REFERENCES students(student_no),
  FOREIGN KEY (doc_type) REFERENCES document_types(name)
);

-- OSAS audit logs (office-specific)
CREATE TABLE IF NOT EXISTS audit_logs (...);

-- OSAS backups
CREATE TABLE IF NOT EXISTS backups (...);

-- OSAS settings
CREATE TABLE IF NOT EXISTS settings (...);

-- Future OSAS-specific tables:
-- organizations, events, clearances, etc.
```

> [!NOTE]
> OSAS `students` table has NO `room`, `cabinet`, `drawer` columns since OSAS has no physical storage room. This is why separate databases per office is the right call — each office defines only the schema it needs.

---

## Role Hierarchy

```
SuperAdmin (global — office_id = NULL)
  ├── Dedicated /superadmin route
  ├── Configures offices (create, edit, deactivate)
  ├── Assigns modules to offices (toggle matrix)
  ├── Manages ALL staff across offices
  ├── Can view any office's data (read-only inspection)
  ├── Sees cross-office analytics
  └── Manages global system settings & backups

Admin (office-scoped — office_id = 'registrar' or 'osas')
  ├── /admin route — sees only their office's modules
  ├── Manages their office's staff
  ├── Approves/reviews their office's documents
  └── Cannot see or access other offices

Staff (office-scoped)
  ├── /staff route — sees only their office's modules
  └── Day-to-day operations within their office
```

---

## Module Registry (Seed Data)

All possible modules that SuperAdmin can toggle per office:

| Module ID | Display Name | Category | Registrar | OSAS | System? |
|---|---|---|---|---|---|
| `records_review` | Records Review | admin | ✅ | ✅ | No |
| `compliance_analytics` | Compliance | admin | ✅ | ✅ | No |
| `request_analytics` | Request Analytics | admin | ✅ | ❌ | No |
| `staff_directory` | Staff Directory | admin | ✅ | ✅ | No |
| `storage_layout` | Storage Layout | admin | ✅ | ❌ | No |
| `system_config` | System Config | admin | ✅ | ✅ | No |
| `backup` | Backup & Restore | admin | ✅ | ✅ | No |
| `audit_logs` | Audit Log | admin | ✅ | ✅ | Yes |
| `alumni_requests` | Alumni Requests | staff | ✅ | ❌ | No |
| `scan_upload` | Scan & Upload | staff | ✅ | ✅ | No |
| `documents` | Documents | staff | ✅ | ✅ | No |
| `notifications` | Notifications | staff | ✅ | ✅ | Yes |
| `records_archive` | Records & Archive | staff | ✅ | ❌ | No |
| `storage_explorer` | Storage Explorer | staff | ✅ | ❌ | No |

> Modules marked **System = Yes** are always enabled and cannot be disabled by the SuperAdmin.

---

## Proposed Changes

### Database Layer

#### [NEW] `src/lib/systemDb.js`
- Manages the `system.sqlite` connection
- `getSystemDb()` — returns the global database handle
- Staff queries, office queries, module queries all go through this

#### [MODIFY] `src/lib/sqlite.js` → refactor to `src/lib/officeDb.js`
- `getOfficeDb(officeId)` — returns the office-specific database handle
- Connection pool: keeps open handles for active offices
- Each office DB initialized with its own schema template
- The current `getDb()` becomes `getOfficeDb('registrar')` for backward compatibility

#### [NEW] `src/lib/officesRepo.js`
- `createOffice(data)` — creates office record + initializes office directory & database
- `listOffices()`, `getOfficeById(id)`, `updateOffice(id, patch)`, `deactivateOffice(id)`

#### [NEW] `src/lib/modulesRepo.js`
- `listAllModules()` — master registry from system DB
- `getOfficeModules(officeId)` — enabled modules for an office
- `setOfficeModules(officeId, moduleIds[])` — bulk toggle
- `isModuleEnabled(officeId, moduleId)` — single check for API guards

#### [MODIFY] `src/lib/staffRepo.js`
- Queries now go to `system.sqlite` instead of office DB
- `createStaff()` — accepts `officeId`
- `listStaff({ officeId })` — filter by office (SuperAdmin sees all)
- All existing functions updated to use `getSystemDb()`

#### [MODIFY] `src/lib/documentsRepo.js`, `studentsRepo.js`, `auditLogsRepo.js`, etc.
- Accept `officeId` parameter → use `getOfficeDb(officeId)` for queries
- Ensures documents, students, audit logs are office-scoped

---

### Authentication & Routing

#### [MODIFY] [middleware.js](file:///c:/Users/Chaoscedd/Programming/web-development/PUPSJ-RMS-Prototype/next-app/middleware.js)
- Add `/superadmin/:path*` to matcher
- SuperAdmin role → allowed on `/superadmin/*`, `/admin/*`, `/staff/*`
- Admin role → allowed on `/admin/*` only (office-scoped)
- Staff role → allowed on `/staff/*` only

#### [MODIFY] [jwt.js](file:///c:/Users/Chaoscedd/Programming/web-development/PUPSJ-RMS-Prototype/next-app/src/lib/jwt.js) + login route
- JWT payload adds: `office_id`, `office_name`
- Login response includes `enabled_modules[]`

#### [MODIFY] [auth/me](file:///c:/Users/Chaoscedd/Programming/web-development/PUPSJ-RMS-Prototype/next-app/src/app/api/auth/me/route.js)
- Response includes `office_id`, `office_name`, `accent_color`, `enabled_modules[]`

#### [MODIFY] [roleUtils.js](file:///c:/Users/Chaoscedd/Programming/web-development/PUPSJ-RMS-Prototype/next-app/src/lib/roleUtils.js)
- Add `isSuperAdminRole(role)` 
- Update `isAdminRole()` to exclude SuperAdmin (they're distinct)
- Add `hasGlobalAccess(role)` — true for SuperAdmin

#### [MODIFY] [AuthGuard.js](file:///c:/Users/Chaoscedd/Programming/web-development/PUPSJ-RMS-Prototype/next-app/src/components/shared/AuthGuard.js)
- Add `SuperAdminGuard` export
- `AuthGuard` accepts optional `requiredModules` prop

---

### API Routes

#### [NEW] `src/app/api/offices/route.js` — `GET`, `POST` (SuperAdmin)
#### [NEW] `src/app/api/offices/[id]/route.js` — `GET`, `PATCH`, `DELETE` (SuperAdmin)
#### [NEW] `src/app/api/offices/[id]/modules/route.js` — `GET`, `PUT` (SuperAdmin)
#### [NEW] `src/app/api/modules/route.js` — `GET` (SuperAdmin, lists all available modules)

#### [MODIFY] Existing API routes
- All office-scoped routes (documents, students, etc.) read `office_id` from JWT
- Use `getOfficeDb(officeId)` instead of `getDb()`
- Staff routes use `getSystemDb()`

---

### Frontend

#### [NEW] `src/app/superadmin/page.js`
- Dedicated SuperAdmin dashboard
- Tabs: Office Management, Module Configuration, Global Staff, System Health, Global Audit Logs

#### [NEW] `src/components/superadmin/`
- `OfficeManagementTab.js` — Office CRUD with status, theming, accent color picker
- `ModuleConfigTab.js` — Toggle matrix (offices × modules)
- `GlobalStaffTab.js` — Cross-office staff directory with office filter
- `GlobalAnalyticsTab.js` — Aggregated metrics across offices

#### [MODIFY] [admin/page.js](file:///c:/Users/Chaoscedd/Programming/web-development/PUPSJ-RMS-Prototype/next-app/src/app/admin/page.js)
- `sidebarItems` dynamically built from `enabledModules` (fetched from `/api/auth/me`)
- Office name + accent color applied to header/sidebar
- Views not in `enabledModules` are skipped entirely

#### [MODIFY] [staff/page.js](file:///c:/Users/Chaoscedd/Programming/web-development/PUPSJ-RMS-Prototype/next-app/src/app/staff/page.js)
- Same dynamic module filtering
- Same office branding

#### [MODIFY] [Sidebar.js](file:///c:/Users/Chaoscedd/Programming/web-development/PUPSJ-RMS-Prototype/next-app/src/components/shared/Sidebar.js)
- Accept `accentColor` prop (replaces hardcoded `#E5484D` / `#ebb800`)
- Accept `officeName` for display

---

### Seed Data

#### [MODIFY] [seedRepo.js](file:///c:/Users/Chaoscedd/Programming/web-development/PUPSJ-RMS-Prototype/next-app/src/lib/seedRepo.js)
- Seed `system.sqlite`:
  - 2 offices: `registrar`, `osas`
  - 14 modules in registry
  - `office_modules` assignments per table above
  - Default admin → `SuperAdmin` role, `office_id = NULL`
  - 1 Registrar Admin, 1 Registrar Staff
  - 1 OSAS Admin, 1 OSAS Staff
- Seed `registrar/db.sqlite`: current sample data (students, docs, etc.)
- Seed `osas/db.sqlite`: OSAS-specific sample data (different doc types)

---

## Implementation Phases

### Phase 1: Database Refactor (Core Infrastructure)
1. Create `systemDb.js` — system database connection manager
2. Refactor `sqlite.js` → `officeDb.js` — office database connection with `getOfficeDb(officeId)`
3. Create `system.sqlite` schema (offices, modules, office_modules, staff)
4. Migrate `staff` table from office DB to system DB
5. Create `officesRepo.js` and `modulesRepo.js`
6. Update `staffRepo.js` to use system DB
7. Add backward-compat: `getDb()` → `getOfficeDb('registrar')`

### Phase 2: Auth & Middleware
1. Update JWT payload with `office_id`
2. Update login route — resolve staff office, include modules
3. Update `/api/auth/me` response
4. Update middleware for `/superadmin` routing
5. Update `roleUtils.js` with SuperAdmin functions
6. Update `AuthGuard.js` with `SuperAdminGuard`

### Phase 3: API Layer
1. New office/module management API routes
2. Update all existing API routes to accept office context from JWT
3. Update repos (documents, students, etc.) to use `getOfficeDb(officeId)`

### Phase 4: SuperAdmin Frontend
1. `/superadmin/page.js` with tabs
2. Office Management UI
3. Module Configuration toggle matrix
4. Global Staff Directory
5. Global Analytics & Audit Logs

### Phase 5: Dynamic Module Loading + OSAS
1. Refactor admin/staff pages for dynamic sidebar
2. Office branding/theming
3. OSAS database schema + seed data
4. OSAS-specific module components (future)

---

## Verification Plan

### Automated
```bash
cd next-app && pnpm dev
```
- Verify no regressions on existing Registrar functionality
- Verify system DB initializes with correct schema
- Verify office DBs initialize independently

### Manual Verification
1. **Reset DB** → verify 3 database files created (`system.sqlite`, `registrar/db.sqlite`, `osas/db.sqlite`)
2. **SuperAdmin login** → redirected to `/superadmin`, sees all offices
3. **Module toggle** → disable `storage_layout` for Registrar → tab disappears from Registrar admin sidebar
4. **Registrar Admin login** → `/admin` with only Registrar modules visible
5. **OSAS Staff login** → `/staff` with only OSAS-enabled modules visible
6. **Data isolation** → OSAS upload not visible in Registrar, and vice versa
7. **Per-office backup** → backup Registrar only → only `.local/registrar/` is archived

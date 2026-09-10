# PUPSJ Records Keeping System Prototype — Agent & Maintainer Guide

This document provides comprehensive orientation to the **PUPSJ Records Management System** prototype: architecture, data model, API structure, authentication, conventions, and operational details. The runnable app lives under **`next-app/`**.

---

## 0. AI Agent Run & Environment Guide (Linux First)

> [!IMPORTANT]
> ### Mandatory Startup Sequence on Linux
> When AI agents or developers execute this project in a Linux environment (e.g., CachyOS, Arch, Ubuntu, Fedora), the environment **MUST** be initialized using this exact 3-step sequence:
>
> 1. **Activate Docker Group**:
>    ```bash
>    newgrp docker
>    ```
>    - **Why**: On Linux, communicating with `/var/run/docker.sock` requires membership in the `docker` group. Subshells spawned by IDEs or terminals may not have this group actively effective. `newgrp docker` activates the group in the active shell.
>    - **Agent Note for Non-Interactive Tool Executions**: In non-interactive subshells (such as automated agent tool calls or bash scripts without an interactive TTY), running `newgrp` interactively may block waiting for input. Agents should use `sg docker -c "docker compose up -d"` or ensure Docker socket access beforehand.
>
> 2. **Start PostgreSQL via Docker Compose**:
>    ```bash
>    cd next-app && docker compose up -d
>    ```
>    - **Why**: The application uses a local PostgreSQL 16 container (`pupsj-rms-postgres`) exposed on host port `5433` (mapped from container `5432`). Running `docker compose up -d` starts this container in detached mode.
>    - To wait until PostgreSQL passes healthchecks before proceeding:
>      ```bash
>      cd next-app && docker compose up -d --wait postgres
>      ```
>
> 3. **Run Dev Server & Migrations**:
>    ```bash
>    cd next-app && pnpm dev
>    ```
>    - **Why**: `pnpm dev` launches `scripts/start-local-dev.mjs`, which verifies that the PostgreSQL container is running and healthy, applies pending migrations (`pnpm db:migrate`), and starts Next.js on `http://localhost:3000`.
>    - **Next.js Only (Fast Restart)**: If Docker Compose and migrations have already been run, you can start Next.js directly with `pnpm dev:next`.

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  / (Login)  │  │ /admin/*    │  │ /staff/*            │ │
│  │  React UI   │  │ Admin Pages │  │ Staff Pages         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Middleware (Auth, Role-based routing)                  │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  API Routes (/api/*)                                    │ │
│  │  ├── /api/auth/*     (login, logout, forgot-password) │ │
│  │  ├── /api/staff/*    (CRUD, security questions)        │ │
│  │  ├── /api/students/* (CRUD with storage location)      │ │
│  │  ├── /api/documents/* (upload, review, metadata)       │ │
│  │  ├── /api/document-requests/* (staff-mediated requests)│ │
│  │  ├── /api/analytics/*  (compliance, SLA metrics)       │ │
│  │  ├── /api/audit-logs/* (search, export)                │ │
│  │  ├── /api/system/*     (reset-db, health, backup)      │ │
│  │  └── /api/ingest/*     (hot-folder, direct upload)     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data & Persistence Layer                  │
│  ┌──────────────────────────────────┐  ┌─────────────────┐  │
│  │  PostgreSQL 16 (Docker Compose)  │  │  File System    │  │
│  │  Container: pupsj-rms-postgres   │  │  .local/uploads │  │
│  │  Port: 5433 (:5432 internal)     │  │  .local/backups │  │
│  │  Database: pupsj_rms             │  │  (encrypted)    │  │
│  └──────────────────────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Repository Pattern

All database access goes through `*Repo.js` files in `src/lib/`:
- `staffRepo.js` - Staff CRUD, password hashing
- `studentsRepo.js` - Student records with storage locations
- `documentsRepo.js` - Document uploads, review workflow
- `documentRequestsRepo.js` - Staff-mediated document requests
- `auditLogsRepo.js` - Audit trail with search
- `coursesRepo.js`, `sectionsRepo.js`, `docTypesRepo.js` - Lookup tables
- `storageLayoutRepo.js` - 2D room/cabinet/drawer layout
- `backupsRepo.js` - Backup metadata and encryption
- `digitizationComplianceRepo.js` - Analytics calculations
- `notificationsRepo.js` - Staff notification state

---

## 2. Repository Layout

| Path | Purpose |
|------|---------|
| `next-app/` | Next.js 16 app root |
| `next-app/src/app/` | App Router pages (`page.js`) and API routes (`api/**/route.js`) |
| `next-app/src/app/admin/page.js` | Admin dashboard (role-gated) |
| `next-app/src/app/staff/page.js` | Staff dashboard |
| `next-app/src/app/account/page.js` | User profile, security settings |
| `next-app/src/app/api/` | REST API endpoints |
| `next-app/src/components/admin/` | Admin-specific tabs (10 components) |
| `next-app/src/components/staff/` | Staff-specific tabs (7 components) |
| `next-app/src/components/shared/` | Cross-cutting UI (Sidebar, modals, etc.) |
| `next-app/src/components/layout/` | Header, Footer |
| `next-app/src/components/ui/` | shadcn/ui primitives (Button, Dialog, Skeleton, etc.) |
| `next-app/src/lib/` | Database repos, utilities, helpers |
| `next-app/public/assets/` | Static assets (fonts, Phosphor icons) |
| `next-app/scripts/` | Utility scripts (hot-folder-watcher, reset-students) |
| `.local/` | Runtime data (SQLite, uploads, backups) |

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router), React 19 |
| **Styling** | Tailwind CSS v4 (`@import "tailwindcss"` in `globals.css`) |
| **Database** | PostgreSQL 16 (via Docker Compose container `pupsj-rms-postgres` on port `5433`; `pg` driver) |
| **Auth** | JWT (HS256) via **jose**, HTTP-only cookie `pup_session` |
| **UI Components** | shadcn/ui primitives (Radix-based) |
| **Notifications** | sonner (toast notifications) |
| **Icons** | Phosphor icons (bold, duotone, fill variants) |
| **Font** | Inter (self-hosted) |
| **Encryption** | Node.js crypto (AES-256-CBC for backups) |

---

## 4. Database Schema

### 4.1 Core Tables

```sql
-- Documents (the central entity)
documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_no TEXT NOT NULL,           -- FK to students
  student_name TEXT,
  doc_type TEXT NOT NULL,             -- FK to document_types
  original_filename TEXT NOT NULL,
  storage_filename TEXT NOT NULL,     -- UUID-based filename in .local/uploads/
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  approval_status TEXT DEFAULT 'Pending', -- Pending/Approved/Declined
  reviewed_by TEXT,                   -- FK to staff
  reviewed_at TEXT,
  review_note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_no) REFERENCES students(student_no),
  FOREIGN KEY (doc_type) REFERENCES document_types(name),
  FOREIGN KEY (reviewed_by) REFERENCES staff(id)
)

-- Students with physical storage location
students (
  student_no TEXT PRIMARY KEY,        -- Format: YYYY-XXXXX
  name TEXT NOT NULL,
  course_code TEXT NOT NULL,          -- FK to courses
  year_level INTEGER NOT NULL,        -- Full year (e.g., 2024)
  section TEXT NOT NULL,              -- FK to sections
  room INTEGER NOT NULL,              -- Physical archive room
  cabinet TEXT NOT NULL,              -- Cabinet letter (A-H)
  drawer INTEGER NOT NULL,            -- Drawer number (1-4)
  status TEXT DEFAULT 'Active',       -- Active/Inactive
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (course_code) REFERENCES courses(code),
  FOREIGN KEY (section, course_code) REFERENCES sections(name, course_code)
)

-- Staff accounts
staff (
  id TEXT PRIMARY KEY,                -- Staff ID (e.g., PUPREGISTRAR-001)
  fname TEXT NOT NULL,
  lname TEXT NOT NULL,
  role TEXT NOT NULL,                 -- Admin or Staff
  section TEXT NOT NULL,
  status TEXT DEFAULT 'Active',         -- Active/Inactive
  email TEXT NOT NULL UNIQUE,         -- Used for login
  last_active TEXT,
  password_hash TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)

-- Document types (configurable)
document_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  name_norm TEXT NOT NULL UNIQUE      -- Normalized for matching
)

-- Courses and sections (lookup tables)
courses (id INTEGER PRIMARY KEY, code TEXT UNIQUE, name TEXT)
sections (id INTEGER PRIMARY KEY, name TEXT, course_code TEXT, UNIQUE(name, course_code))

-- Document requests (staff-mediated alumni requests)
document_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_no TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',      -- Pending/InProgress/Ready/Completed/Cancelled
  notes TEXT,
  linked_document_id INTEGER,         -- FK to documents (optional)
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
)
```

### 4.2 System Tables

```sql
-- Audit logs (accountability)
audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT DEFAULT (datetime('now')),
  actor TEXT NOT NULL,                -- Staff display name
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  ip TEXT
)

-- Backup registry
backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  status_local TEXT DEFAULT 'Pending',
  status_external TEXT DEFAULT 'Pending',
  status_offsite TEXT DEFAULT 'Pending',
  encryption_key_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)

-- Settings (key-value store)
settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
)
-- Used for: schema_version, storage_layout (JSON), system config

-- Security questions for password recovery
security_questions (id INTEGER PRIMARY KEY, question TEXT)
staff_security_answers (
  staff_id TEXT,
  question_id INTEGER,
  answer_hash TEXT,
  PRIMARY KEY (staff_id, question_id),
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES security_questions(id) ON DELETE CASCADE
)
```

### 4.3 Storage Layout JSON Structure

```json
{
  "version": 2,
  "rooms": [
    {
      "id": 1,
      "name": "Room 1",
      "cabinets": [
        {
          "id": "A",
          "rect": { "x": 0.05, "y": 0.05, "w": 0.2, "h": 0.4 },
          "rotation": 0,
          "drawerIds": [1, 2, 3, 4]
        }
      ],
      "door": { "x": 0.05, "y": 0.96 }
    }
  ]
}
```

---

## 5. Environment Variables

Create a `.env.local` file in `next-app/` with these variables:

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | **Yes** | `postgres://pupsj_rms:pupsj_rms_local@localhost:5433/pupsj_rms` | Connection string for PostgreSQL container |
| `JWT_SECRET` | **Yes** | — | Secret key for JWT signing (HS256). **Must be set for auth to work.** |
| `SESSION_COOKIE_NAME` | No | `pup_session` | Name of the HTTP-only session cookie |
| `LOCAL_DATA_DIR` | No | `.local/` | Path to uploads and local data directory |
| `DEFAULT_STAFF_PASSWORD` | No | `pupstaff` | Default password for new staff accounts |
| `NEXT_PUBLIC_DEFAULT_STAFF_PASSWORD` | No | `pupstaff` | Exposed to UI for display purposes |
| `BACKUP_ENCRYPTION_KEY` | No | `JWT_SECRET` fallback | AES-256 key for backup encryption |
| `EXTERNAL_BACKUP_PATH` | No | `.local/external_media` | External backup destination |
| `HOT_FOLDER_INGEST_TOKEN` | No | — | Bearer token for hot-folder scanner API |
| `HOT_FOLDER_API_URL` | No | `http://localhost:3000/api/ingest/hot-folder` | Endpoint for hot-folder uploads |
| `HOT_FOLDER_SOURCE_STATION` | No | `Scanner-PC` | Identifier for scanner station |
| `HOT_FOLDER_ROOT` | No | `.local/hot-folder` | Hot-folder filesystem root |
| `NODE_ENV` | No | — | Set to `production` for secure cookies |

### 5.1 Default Accounts (Reset DB & Demo Accounts)

After calling `GET /api/system/reset-db` or running `node scripts/seed-test-accounts.mjs`, the system seeds default accounts:

| Role | Staff ID | Name | Email | Default Route |
|------|----------|------|-------|---------------|
| **SuperAdmin** | `PUPSUPERADMIN-001` | System Administrator | `superadmin@pup.local` *(or `admin.default@pup.local`)* | `/systemadmin` |
| **Registrar Admin** | `PUPREGISTRAR-003` | Elias Austria | `admin.registrar@pup.local` | `/admin` |
| **Registrar Staff** | `PUPREGISTRAR-002` | Marcus Reyes | `staff.registrar@pup.local` | `/staff` |
| **OSAS Admin** | `PUPOSAS-001` | Sandra Gomez | `admin.osas@pup.local` | `/admin` |

The default password for all personnel accounts is `pupstaff` (configured via `DEFAULT_STAFF_PASSWORD`).

**Important**: After resetting the database, you **must restart** the Next.js server for the changes to take effect.

---

## 6. Authentication & Authorization

### 6.1 Authentication Flow

1. **Login** (`POST /api/auth/login`):
   - Validates email/password against `staff` table
   - Creates JWT payload: `{ sub, role, username, last_active, mustChangePassword }`
   - Sets HTTP-only cookie `pup_session`
   - Broadcasts login to admins via Socket.io

2. **Session Validation** (Middleware):
   - Reads `pup_session` cookie
   - Verifies JWT via `verifySessionToken()`
   - Redirects unauthenticated users to `/`
   - Redirects non-admin users from `/admin` to `/staff`

3. **Role-Based Access**:
   - **Admin**: Full access to `/admin/*` routes and all APIs
   - **Staff**: Access to `/staff/*` routes only
   - API routes check role in handler: `if (user.role !== "Admin") return 401`

### 6.2 Middleware Configuration (`middleware.js`)

```javascript
// Protected routes pattern
matcher: ["/admin/:path*", "/staff/:path*", "/api/:path*"]

// Auth exceptions (public)
- /api/auth/login, /api/auth/logout, /api/auth/me, /api/auth/forgot-password
- / (login page)

// Special case: Hot-folder ingest uses Bearer token auth
pathname === "/api/ingest/hot-folder" && method === "POST"
```

### 6.3 API Authentication Pattern

```javascript
// Standard pattern in API routes
import { getSessionCookieName, verifySessionToken } from "@/lib/jwt";
import { getStaffById } from "@/lib/staffRepo";

export async function GET(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  
  const payload = await verifySessionToken(token);
  const userId = payload.sub;
  const user = await getStaffById(userId);
  
  // Role check for admin-only routes
  if (user.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  
  // ... proceed with handler
}
```

---

## 7. API Conventions

### 7.1 Response Format

All API responses follow this structure:

```json
// Success
{ "ok": true, "data": {...} }

// Error
{ "ok": false, "error": "Human-readable error message" }
```

### 7.2 HTTP Methods

| Method | Usage |
|--------|-------|
| `GET` | List, retrieve, search (with query params) |
| `POST` | Create new resources |
| `PATCH` | Partial updates (preferred over PUT) |
| `DELETE` | Remove resources |
| `PUT` | Full resource replacement (rare) |

### 7.3 Key API Endpoints

| Endpoint | Method | Access | Purpose |
|----------|--------|--------|---------|
| `/api/auth/login` | POST | Public | Authenticate, set cookie |
| `/api/auth/logout` | POST | Any auth | Clear session |
| `/api/auth/me` | GET | Any auth | Get current user |
| `/api/staff` | GET/POST | Admin | List/create staff |
| `/api/staff/[id]` | PATCH/DELETE | Admin | Update/delete staff |
| `/api/students` | GET/POST | Any auth | List/create students |
| `/api/students/[id]` | PATCH/DELETE | Any auth | Update/delete students |
| `/api/documents` | POST | Any auth | Upload document |
| `/api/documents/[id]` | GET/PATCH | Any auth | Get/update document |
| `/api/documents/[id]/review` | POST | Admin | Approve/decline document |
| `/api/document-requests` | GET/POST | Any auth | List/create requests |
| `/api/document-requests/[id]` | PATCH | Any auth | Update request status |
| `/api/analytics/digitization-compliance` | GET | Admin | Compliance metrics |
| `/api/analytics/document-requests` | GET | Admin | Request analytics (SLA) |
| `/api/audit-logs` | GET | Any auth | Search logs (`?mine=1` for personal) |
| `/api/storage-layout` | GET/PUT | Any auth / Admin only PUT | Room/cabinet layout |
| `/api/system/reset-db` | GET | Any auth (destructive) | Wipe and reseed database |
| `/api/system/seed-mock-data` | GET | Any auth | Populate database with mock data |
| `/api/system/health` | GET | Any auth | System metrics |
| `/api/ingest/hot-folder` | POST | Bearer token | Scanner hot-folder ingest |

### 7.4 Client-Side Data Fetching

Use `cache: "no-store"` for data that must reflect immediate DB changes:

```javascript
const res = await fetch("/api/storage-layout", { cache: "no-store" });
```

---

## 8. Design System & Theme (PUP)

### 8.1 Tailwind Tokens (`@theme` in `globals.css`)

| Token | Value | Usage |
|-------|-------|-------|
| `pup-maroon` | `#800000` | Primary brand, buttons, headers |
| `pup-darkMaroon` | `#5a0000` | Hover states, accents |
| `pup-gray` | `#f3f4f6` | Backgrounds, cards |
| `pup-text` | `#1f2937` | Body text |
| `pup-border` | `#e5e7eb` | Borders, dividers |
| `rounded-brand` | `--radius` | Consistent corner radius |

### 8.2 Typography

- **Primary**: Inter (self-hosted from `public/assets/fonts/inter/`)
- **Mono**: System mono for IDs/timestamps (e.g., `font-mono text-[11px]`)

### 8.3 Icon System (Phosphor)

Loaded variants: `bold`, `duotone`, `fill`, `thin`, `light`

Common patterns:
- Navigation: `ph-bold ph-icon-name`
- Empty states: `ph-duotone ph-icon-name` (larger, `text-3xl`)
- Status indicators: `ph-fill ph-icon-name` (solid)

### 8.4 Button Conventions & Apple HIG Standards

Buttons follow clean Apple Human Interface Guidelines (HIG) with standardized dimensions, typography, and variants:

```jsx
// 1. Primary Action Button: Text-only (no static leading icons like plus/upload)
<Button className="h-10 px-5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all">
  Register Staff
</Button>

// 2. Secondary / Dismissive Action Button: Outlined (NOT borderless ghost)
<Button variant="outline" className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all">
  Cancel
</Button>

// 3. Universal Refresh Action: Icon-only squircle button with accessible tooltip
<RefreshButton onRefresh={() => fetchData(true)} isLoading={isLoading} title="Refresh Records" />
// Note: Never use text-only "Refresh" buttons in headers. RefreshButton renders a 40x40px rounded-xl squircle.
```

- **Sizing Standards**: Standard forms/headers use `h-10 px-5 text-xs font-semibold rounded-xl`. Compact tables/toolbars use `h-9 px-4 text-xs font-semibold rounded-xl` (or `h-8` for inline action badges).
- **Icons on Buttons**: Keep primary action buttons text-only to maintain visual focus. Dynamic icons (e.g. `ph-spinner animate-spin`) are permitted only during loading/saving states.

### 8.5 Border Radius Hierarchy (Apple HIG Tokens)

| Scope | Token | Usage |
|---|---|---|
| **Outer Page Containers** | `rounded-2xl` | Standalone cards, single-card views, sheets, dialog popups |
| **Controls & Tiles** | `rounded-xl` | Buttons, text inputs, `<Select>` dropdown triggers, squircle icon tiles |
| **Segmented Items & Badges** | `rounded-lg` | Segmented control buttons, dropdown menu items, table action buttons (`w-7 h-7`), active filter chips |
| **Switches & Indicators** | `rounded-full` | Apple toggle switches, status pill badges, presence dot indicators |

### 8.6 Segmented Controls & Dropdowns (`<Select>`)

- **Segmented Control / Frequency Tabs**:
  ```jsx
  <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
    <button type="button" className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs">
      Daily
    </button>
    <button type="button" className="px-4 py-1.5 text-xs font-semibold rounded-lg text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white">
      Weekly
    </button>
  </div>
  ```
- **`<Select>` Dropdown Component (`@/components/ui/select`)**:
  - Always use the project's `<Select>` component.
  - **CRITICAL AGENT RULE ON SCROLLBARS**: Never add `max-h-* overflow-y-auto` to `menuClassName`. The inner options container already manages scrolling (`max-h-60 overflow-y-auto`). Adding scroll classes to `menuClassName` creates nested double scrollbars!
  - Standard `<Select>` usage:
    ```jsx
    <Select
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="h-9 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs"
      menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
      optionClassName="rounded-lg text-xs font-semibold py-1.5 px-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800"
    >
      <option value="1">Option 1</option>
    </Select>
    ```

### 8.7 Table Action Columns & Filter Chips

- **Action Column Squircle Buttons**: Standardized to 28x28px squircle buttons with accessible `<Tooltip>`:
  ```jsx
  <Tooltip>
    <TooltipTrigger asChild>
      <button className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95">
        <i className="ph-bold ph-eye text-[16px]" />
      </button>
    </TooltipTrigger>
    <TooltipContent>View Details</TooltipContent>
  </Tooltip>
  ```
- **Active Filter Chips**: Standardized pattern used across all data tables:
  ```jsx
  <div className="flex-none border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card px-6 py-3">
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">Active filters:</span>
      <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
        Search: {search}
        <button onClick={clearSearch} className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer">×</button>
      </div>
      <Button variant="ghost" size="sm" onClick={clearAll} className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent p-0 hover:text-red-600 dark:hover:text-red-500 cursor-pointer">
        Clear
      </Button>
    </div>
  </div>
  ```

---

## 9. Component Architecture

### 9.1 Component Organization

```
src/components/
├── admin/                    # Admin-only views
│   ├── AuditLogsTab.js
│   ├── BackupMaintenanceTab.js
│   ├── DigitalRecordsReviewTab.js   # Document approval workflow
│   ├── RegisterAccountTab.js
│   ├── SLAAnalyticsTab.js           # Request analytics
│   ├── StaffDirectoryTab.js
│   ├── StorageLayoutEditorTab.js    # 2D room editor
│   ├── SystemAnalyticsTab.js        # Compliance dashboard
│   ├── SystemConfigTab.js           # Courses, doc types, sections
│   └── backup/AutoBackupSchedule.js # Recurring automated backup schedule
├── systemadmin/              # Superadmin views
│   ├── CampusOperationsTab.js       # Live campus operations & services
│   ├── GlobalAuditLogsTab.js        # Platform-wide security audit trail
│   ├── GlobalStaffTab.js            # Unified staff directory
│   ├── OfficeManagementTab.js       # Campus offices & departments
│   ├── ModuleConfigTab.js           # Platform module matrices
│   ├── SystemBackupsTab.js          # System governance archives & automated backups
│   └── LandingPageCmsTab.js         # Public portal CMS
├── staff/                    # Staff views
│   ├── DocumentRequestsTab.js # Alumni request management
│   ├── DocumentsTab.js        # Student document matrix
│   ├── NotificationsTab.js
│   ├── OCRPromptModal.js
│   ├── RecordsArchiveTab.js   # Physical archive explorer
│   └── ScanUploadTab.js       # Document scanning/upload
├── shared/                   # Cross-cutting components
│   ├── ConfirmModal.js
│   ├── PDFPreviewModal.js
│   ├── PromptModal.js
│   ├── RefreshButton.js      # Standard Apple squircle reload button
│   ├── RoomMap2D.js          # Storage visualization
│   ├── Sidebar.js            # Navigation sidebar
│   └── UserGuideModal.js
├── layout/                   # Layout components
│   ├── Header.js
│   └── Footer.js
└── ui/                       # shadcn/ui primitives
    ├── badge.js
    ├── button.js
    ├── card.js
    ├── dialog.jsx
    ├── select.jsx
    ├── skeleton.js
    ├── toast.jsx (sonner wrapper)
    └── tooltip.jsx
```

### 9.2 Unified Single-Card Layout Pattern

In SuperAdmin dashboards, views consolidate the Page Header, Tabs/Segmented controls, Filter Bars, Active Filter Chips, and Data Table into a **single unified Card container**:

```jsx
<Card className="flex-1 flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate">
  {/* 1. Header with icon, title, description, and action toolbar */}
  <PageHeader title="Campus Operations" actions={<RefreshButton ... />} showBorder={false} />
  
  {/* 2. Embedded Segmented Controls / Frequency Switchers */}
  <div className="px-6 py-3 border-t border-gray-100 dark:border-white/10 ...">...</div>
  
  {/* 3. Search & Filter Toolbar */}
  <div className="px-6 py-3 border-t border-gray-100 dark:border-white/10 ...">...</div>

  {/* 4. Active Filter Chips */}
  {hasFilters && <div className="px-6 py-3 border-t ...">...</div>}

  {/* 5. Seamless Table or Scrollable Content */}
  <div className="flex-1 overflow-x-auto border-t border-gray-100 dark:border-white/10">...</div>
</Card>
```
- **Rationale**: Eliminates disjointed card boundaries and reduces wasted vertical/horizontal whitespace while keeping the viewport unified and clean.

### 9.3 Modal Patterns & The Dialog Spacing Trap

When building custom modals with `Dialog` (`@/components/ui/dialog`):

```jsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  {/* 1. Always pass flex flex-col gap-0 to override default grid gap-4 */}
  <DialogContent className="sm:max-w-xl w-full rounded-2xl bg-white border border-gray-200 dark:bg-zinc-900 dark:border-white/10 p-0 shadow-2xl overflow-hidden flex flex-col gap-0">
    
    {/* 2. Header with generous 24px padding and bottom border */}
    <DialogHeader className="p-6 pb-4 bg-white dark:bg-card border-b border-gray-100 dark:border-white/10 text-left">
      <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em]">Modal Title</DialogTitle>
      <DialogDescription className="text-xs text-gray-500 mt-1">Modal context</DialogDescription>
    </DialogHeader>

    {/* 3. Scrollable Body with matching 24px padding */}
    <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
      {children}
    </div>

    {/* 4. Footer: DO NOT USE raw <DialogFooter> without resetting margins! */}
    {/* Reason: DialogFooter in Base UI has hardcoded -mx-4 -mb-4 which pulls the footer out of bounds by 16px, cancelling p-4 padding and slamming the Close button flush into the bottom-right corner with 0 space. */}
    <div className="px-6 py-4 bg-white dark:bg-card border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
      <span className="text-xs text-gray-500">Metadata</span>
      <Button variant="outline" onClick={() => setIsOpen(false)} className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all">
        Close
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

**Important Rules for AI Agents**:
1. **Never use raw `<DialogFooter>` inside `p-0` card modals** unless you explicitly clear its negative margins with `m-0`, or prefer using a standard `<div className="px-6 py-4 ...">`.
2. **Always include `flex flex-col gap-0` on `<DialogContent>`** when designing full-bleed modals with header/body/footer divisions.
3. **Do not pass `asChild` to raw DOM elements**. Use `Button` or standard anchor tags.

---

## 10. Data Loading & State Patterns

### 10.1 Loading States

Use `Skeleton` from `@/components/ui/skeleton`:

```jsx
// Preferred: Structured skeleton matching layout
<div className="space-y-4">
  <div className="grid grid-cols-4 gap-3">
    {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-brand" />)}
  </div>
  <Skeleton className="h-4 w-full max-w-md" />
  <Skeleton className="h-32 rounded-brand" />
</div>

// Exception: OCR/scanning has custom animated state (not skeleton)
```

### 10.2 Empty States (Tables)

```jsx
{displayLogs.length === 0 ? (
  <tr className="border-0 hover:bg-transparent">
    <td colSpan={5} className="p-0 border-0">
      <div className="h-[400px] flex flex-col items-center justify-center text-gray-500">
        <div className="w-16 h-16 rounded-full bg-white border border-gray-200 
                        flex items-center justify-center mb-4 shadow-sm">
          <i className="ph-duotone ph-icon-name text-3xl text-pup-maroon"></i>
        </div>
        <div className="text-lg font-bold text-gray-900">No data yet</div>
        <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
          Actionable subtitle text
        </div>
      </div>
    </td>
  </tr>
) : (
  // ... table rows
)}
```

### 10.3 Pagination Pattern

```jsx
<div className="mt-4 flex items-center justify-between">
  <div className="text-xs font-medium text-gray-500">
    Showing {start}-{end} of <strong>{total.toLocaleString()}</strong> entries
  </div>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" disabled={page <= 1} 
            onClick={() => setPage(p => p - 1)}>
      <i className="ph-bold ph-caret-left"></i> Previous
    </Button>
    <div className="px-3 text-xs font-bold text-gray-700 bg-white border 
                    border-gray-200 rounded-md h-8 flex items-center justify-center">
      {page} / {totalPages}
    </div>
    <Button variant="outline" size="sm" disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}>
      Next <i className="ph-bold ph-caret-right"></i>
    </Button>
  </div>
</div>
```

---

## 11. Audit & Compliance

### 11.1 Audit Logging

Every significant action is logged via `writeAuditLog()`:

```javascript
import { writeAuditLog } from "@/lib/auditLogRequest";

await writeAuditLog(req, "Action description", {
  actor: staffDisplayName,
  role: staffRole,
});
```

Logged actions include: login/logout, document uploads, approvals, staff changes, backups, etc.

### 11.2 Time Display

Always use `formatPHDateTime()` from `@/lib/timeFormat` for user-visible timestamps:

```javascript
import { formatPHDateTime } from "@/lib/timeFormat";

// Returns: "Jan 15, 2024 02:30 PM" (Asia/Manila timezone)
const displayTime = formatPHDateTime(isoString);
```

---

## 12. File Storage

### 12.1 Document Storage

- **Path**: `{LOCAL_DATA_DIR}/uploads/{storage_filename}`
- **Filename format**: `{uuidv4()}.{ext}` (original extension preserved)
- **Metadata**: Stored in `documents` table with reference to original filename

### 12.2 Backup Storage

- **Local**: `{LOCAL_DATA_DIR}/backups/`
- **External**: `{EXTERNAL_BACKUP_PATH}/` (or default `.local/external_media/`)
- **Encryption**: AES-256-CBC with key derived from `BACKUP_ENCRYPTION_KEY` or `JWT_SECRET`

---

## 13. Development Commands & Environment Setup

### 13.1 Linux Startup Sequence (Mandatory for AI Agents & Developers)

When running the application on Linux (e.g., CachyOS, Arch, Ubuntu, Debian), follow this exact workflow:

```bash
# 1. Ensure docker group membership is active in current shell
newgrp docker

# 2. Start PostgreSQL container in detached mode (from next-app/)
cd next-app
docker compose up -d

# 3. Start development server, verify DB health, and run migrations
pnpm dev
```

#### AI Agent Execution Guidance
- **Interactive Terminal**: When a human developer or an agent with an interactive TTY starts the workspace, run `newgrp docker`, then `docker compose up -d`, then `pnpm dev`.
- **Non-Interactive Tool Executions**: When an AI agent executes single-line commands through automated subshells (where `newgrp` may wait on STDIN), use `sg docker -c "<command>"` or ensure docker permissions beforehand:
  ```bash
  sg docker -c "docker compose -f /path/to/next-app/docker-compose.yml up -d"
  ```
- **Postgres Container Details**:
  - Service: `postgres:16-alpine`
  - Container name: `pupsj-rms-postgres`
  - Port mapping: `5433:5432` (Host: 5433, Container: 5432)
  - Connection: `postgres://pupsj_rms:pupsj_rms_local@localhost:5433/pupsj_rms`

### 13.2 Command Reference (from `next-app/`)

```bash
# === Core App Commands ===
# Full development flow: starts Docker Postgres, applies migrations, starts Next.js + hot-folder watcher
pnpm dev

# Next.js only (skips docker compose up & migration checks - requires DB already running)
pnpm dev:next

# Production build
pnpm build

# Production start
pnpm start

# Code linting
pnpm lint

# === Database Commands ===
# Apply all pending PostgreSQL migrations
pnpm db:migrate

# Seed sample data (safe to rerun, conflict-safe inserts)
pnpm db:seed:sample

# Seed default test accounts (SuperAdmin, Registrar Admin/Staff, OSAS Admin, Student)
pnpm db:seed:test

# Verify local PostgreSQL connectivity and table status
pnpm db:verify

# Create encrypted PostgreSQL backup
pnpm db:backup

# === Docker Compose Commands ===
# Start PostgreSQL in background
docker compose up -d

# Start and wait until PostgreSQL is healthy
docker compose up -d --wait postgres

# Stop PostgreSQL container
docker compose down

# View database container logs
docker compose logs -f postgres
```

---

## 14. Conventions Checklist

When making changes to this codebase:

- [ ] **Use repository pattern** — Add SQL to `*Repo.js`, not inline in API routes
- [ ] **Respect foreign keys** — Check `PRAGMA foreign_keys = ON` constraints
- [ ] **Theme consistency** — Use `pup-maroon`, `rounded-brand`, `font-inter`
- [ ] **Skeleton loading** — For tables, lists, modals (except OCR scanning animation)
- [ ] **Time formatting** — Use `formatPHDateTime()` for display
- [ ] **Audit logging** — Call `writeAuditLog()` for mutations
- [ ] **Auth checks** — Verify session token and role in admin-only routes
- [ ] **API response format** — Return `{ ok: true, data }` or `{ ok: false, error }`
- [ ] **Storage layout safety** — Validate student usage before deleting rooms/cabinets
- [ ] **Client fetch caching** — Use `cache: "no-store"` for real-time data

---

*Last updated: Comprehensive architecture documentation covering database schema, environment variables, default credentials, API patterns, component architecture, and system conventions.*

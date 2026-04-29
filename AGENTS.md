# PUPSJ Records Keeping System Prototype — Agent & Maintainer Guide

This document provides comprehensive orientation to the **PUPSJ Records Management System** prototype: architecture, data model, API structure, authentication, conventions, and operational details. The runnable app lives under **`next-app/`**.

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
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │  SQLite (sql.js)│  │  File System                     │  │
│  │  .local/        │  │  .local/uploads/ (PDFs, scans)   │  │
│  │  └── db.sqlite  │  │  .local/backups/ (encrypted)     │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
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
| **Database** | sql.js (SQLite in-process, file-based persistence) |
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
| `JWT_SECRET` | **Yes** | — | Secret key for JWT signing (HS256). **Must be set for auth to work.** |
| `SESSION_COOKIE_NAME` | No | `pup_session` | Name of the HTTP-only session cookie |
| `LOCAL_DATA_DIR` | No | `.local/` | Path to SQLite and uploads directory |
| `DEFAULT_STAFF_PASSWORD` | No | `pupstaff` | Default password for new staff accounts |
| `NEXT_PUBLIC_DEFAULT_STAFF_PASSWORD` | No | `pupstaff` | Exposed to UI for display purposes |
| `BACKUP_ENCRYPTION_KEY` | No | `JWT_SECRET` fallback | AES-256 key for backup encryption |
| `EXTERNAL_BACKUP_PATH` | No | `.local/external_media` | External backup destination |
| `HOT_FOLDER_INGEST_TOKEN` | No | — | Bearer token for hot-folder scanner API |
| `HOT_FOLDER_API_URL` | No | `http://localhost:3000/api/ingest/hot-folder` | Endpoint for hot-folder uploads |
| `HOT_FOLDER_SOURCE_STATION` | No | `Scanner-PC` | Identifier for scanner station |
| `HOT_FOLDER_ROOT` | No | `.local/hot-folder` | Hot-folder filesystem root |
| `NODE_ENV` | No | — | Set to `production` for secure cookies |

### 5.1 Default Admin Account (Reset DB)

After calling `GET /api/system/reset-db`, the system seeds a default admin:

| Field | Value |
|-------|-------|
| **Staff ID** | `PUPREGISTRAR-001` |
| **First Name** | Elias |
| **Last Name** | Austria |
| **Email** | `admin.eli@pup.local` |
| **Role** | Admin |
| **Section** | Administrative |
| **Status** | Active |
| **Password** | Value of `DEFAULT_STAFF_PASSWORD` env var (default: `pupstaff`) |

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

### 8.4 Button Conventions

```jsx
// Primary action
<Button className="bg-pup-maroon hover:bg-red-900 text-white font-bold">
  Save
</Button>

// Secondary/Outline
<Button variant="outline" className="border-gray-300 text-gray-700">
  Cancel
</Button>

// Size: sm for tables/toolbars (h-9), default for forms (h-10)
```

### 8.5 Form Input Pattern

```jsx
<div>
  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
    Field Label
  </label>
  <div className="relative">
    <i className="ph-bold ph-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
    <Input className="pl-10 h-10 w-full bg-white border border-gray-300 rounded-brand 
                      focus-visible:ring-pup-maroon focus-visible:border-pup-maroon" />
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
│   ├── SystemAnalyticsTab.js          # Compliance dashboard
│   └── SystemConfigTab.js             # Courses, doc types, sections
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
    ├── dialog.js
    ├── skeleton.js
    ├── toast.jsx (sonner wrapper)
    └── tooltip.jsx
```

### 9.2 Tab Component Pattern

Admin and staff pages use a **tab-based navigation** with shared state:

```javascript
// In page.js
const [view, setView] = useState("directory");
const sidebarItems = [
  { type: "header", label: "User Management" },
  { key: "directory", label: "Staff Directory", iconClass: "ph-bold ph-users" },
  // ...
];

// Render based on view
{view === "directory" && <StaffDirectoryTab ... />}
```

### 9.3 Modal Patterns

Use `Dialog` from `@/components/ui/dialog`:

```jsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="rounded-brand">
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
      <DialogDescription>Context about the action</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button onClick={handleAction}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Important**: Do not pass `asChild` to DOM elements. Use `Button` or plain `<a>` tags.

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

## 13. Development Commands

From `next-app/` directory:

```bash
# Development (includes hot-folder watcher)
pnpm dev

# Next.js only (no watcher)
pnpm dev:next

# Hot-folder watcher only (for existing server)
pnpm hot-folder-watcher

# Production build
pnpm build

# Linting
pnpm lint
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

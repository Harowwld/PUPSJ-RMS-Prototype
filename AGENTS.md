# PUPSJ RMS Prototype — Agent & Maintainer Guide

This document orients AI agents and developers to the **PUPSJ Records Management System** prototype: structure, visual design, data layer, and recent architectural decisions. The runnable app lives under **`next-app/`**.

---

## 1. Repository layout

| Path | Purpose |
|------|---------|
| `next-app/` | Next.js 16 app (App Router), API routes, React UI, SQLite persistence |
| `next-app/src/app/` | Routes (`page.js`), layouts, API handlers (`api/**/route.js`) |
| `next-app/src/components/` | Feature UI: `admin/`, `staff/`, `layout/`, `shared/`, `ui/` (shadcn-style primitives) |
| `next-app/src/lib/` | DB repos, JWT, audit helpers, storage layout, OCR client, time formatting |

---

## 2. Tech stack

- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss"` in `globals.css`, `@theme` tokens)
- **Database**: **sql.js** (SQLite in-process); file at `.local/db.sqlite` (or `LOCAL_DATA_DIR`)
- **Auth**: HTTP-only session cookie `pup_session`, JWT (HS256) via **jose**; `JWT_SECRET` required
- **Toasts**: **sonner** (`toast`, `toast.promise` for long async ops)
- **Icons**: Phosphor icon classes (e.g. `ph-bold ph-users`, `ph-duotone ph-warehouse`) loaded via project CSS/vendor setup—not Lucide for most screens

---

## 3. Design system & theme (PUP)

Central tokens are defined in `next-app/src/app/globals.css` inside `@theme`:

- **Primary brand**: `pup-maroon` → `#800000`; darker accent `pup-darkMaroon` → `#5a0000`
- **Neutrals**: `pup-gray`, `pup-text`, `pup-border`; cards often `bg-white`, `border-gray-200`, `rounded-brand`
- **Radius**: `rounded-brand` maps to `--radius-brand` / `--radius` (consistent rounded corners app-wide)
- **Typography**: **Inter** (self-hosted under `public/assets/fonts/inter/`); body uses `font-inter` / sans stack
- **Focus / inputs**: Maroon ring or border on focus (`focus-visible:ring-pup-maroon`, `focus-visible:border-pup-maroon`)
- **Buttons**: Primary actions use `bg-pup-maroon`, `hover:bg-red-900`, bold labels; outline buttons use gray borders with maroon hover

**UI patterns to preserve**

- **Skeleton loading**: Prefer `@/components/ui/skeleton` for list/table/modal loading—not spinners or plain “Loading…” text in major views. **Exception**: OCR/scanning in `ScanUploadTab` uses a dedicated rotating/progress animation, not skeletons. See **section 14** for table empty states and pagination.
- **Profile / account**: Subtle accented chrome (`rounded-brand`, light borders, small type); avoid heavy circular-only avatar styling unless the screen already uses it.
- **Modals**: `Dialog` from `@/components/ui/dialog`; avoid passing `asChild` to DOM elements that don’t support it (use plain `<a>` or `Button` without invalid prop forwarding).
- **Time display**: Use `@/lib/timeFormat` — `formatPHDateTime`, `formatPHDateTimeParts` — **Asia/Manila** for consistency with audit logs and admin tables.

---

## 4. Authentication & roles

- Login validates against the **`staff`** table (no hardcoded `admin/admin`).
- Session payload identifies the user; admin-only UIs check **staff role** (e.g. Admin).
- **Default admin seed** (for fresh installs / `reset-db`): documented in API reset flow — default admin email **`admin.eli@pup.local`** with default staff password pattern used in registration docs (e.g. `pupstaff`). **Always** verify `src/app/api/system/reset-db/route.js` for the exact seeded credentials.

---

## 5. Data & persistence

- **SQLite** (`getDb()` in `src/lib/sqlite.js`): students, staff, documents, doc types, courses, sections, audit logs, settings (including **storage layout** JSON), backups metadata, etc.
- **Foreign keys**: `PRAGMA foreign_keys = ON` — respect FKs when deleting or restructuring.
- **Repositories**: `*Repo.js` files in `src/lib/` encapsulate SQL; API routes should call these rather than ad-hoc SQL.

---

## 6. Storage layout (SLV)

- **Source of truth**: JSON in settings, validated/normalized by `storageLayoutRepo.js`; defaults in `storageLayoutDefaults.js` (**version 2**).
- **Coordinates**: Normalized **0..1** rects (`x`, `y`, `w`, `h`) per cabinet inside a room canvas; **`rotation`** `0` or `90` (swaps effective width/height in UI).
- **Rooms**: Numeric IDs; **cabinets**: string IDs (e.g. `A`–`H`); **drawers**: numeric IDs per cabinet (`drawerIds` array).
- **API**: `GET/PUT /api/storage-layout` — **PUT** is admin-only. Server rejects layouts that **remove** room/cabinet/drawer combinations still referenced by **student** records (`listStudentLocationUsage` + `buildLayoutLocationSet` in the route). Users must reassign students before deleting locations.
- **Staff UI**: `RecordsArchiveTab`, `RoomMap2D`, `ScanUploadTab` consume layout from `/api/storage-layout`; staff dashboard refetches layout when switching to upload/search tabs so dropdowns stay in sync. **Records & Archive** offers **Full screen** on the storage map so staff can see the whole room and scroll the “documents on file” column when a student has many records.
- **Admin UI**: `StorageLayoutEditorTab` — also linked from the **admin sidebar** as **Storage Layout** (not only inside System Data).

---

## 7. Audit logs & “My Activity”

- **Repository**: `auditLogsRepo.js` — supports search and optional **`actorExact`** filter.
- **API**: `GET /api/audit-logs?limit=&offset=&search=&mine=1` — `mine=1` resolves the current session’s staff **full name** and filters `actor` exactly (for personal activity).
- **Actor names**: `auditLogRequest.js` resolves actor from staff **first + last name** when possible (not only email).
- **Account page**: `/account/activity` shows the current user’s activity (not the full admin audit log UI).

---

## 8. Major UI surfaces

| Area | Entry | Notes |
|------|--------|--------|
| Admin dashboard | `src/app/admin/page.js` | Sidebar views: directory, register, audit logs, system data, **storage layout**, digital review, backup & maintenance |
| Staff dashboard | `src/app/staff/page.js` | Records archive, scan/upload, **Documents**, **Document requests** (staff-mediated alumni/counter requests); uses dynamic storage layout |
| Account | `src/app/account/page.js` | Vertical tabs: profile, security; link to **My Activity** |
| PDF preview | `components/shared/PDFPreviewModal.js` | Large modal, PUP-styled header, iframe `#view=FitH`, skeleton until iframe load |

---

## 9. Document requests (staff-mediated)

- **Purpose**: Staff record **requests for documents** on behalf of alumni or walk-ins (no public alumni portal in the current prototype).
- **Table**: `document_requests` (see schema migration in `sqlite.js`) — `student_no`, `doc_type`, `status` (`Pending` / `InProgress` / `Ready` / `Completed` / `Cancelled`), optional `notes`, optional `linked_document_id` → `documents.id`, audit fields `created_by` / `updated_by`.
- **API**: `GET/POST /api/document-requests`, `GET/PATCH /api/document-requests/[id]` — **active staff session** required (same cookie/JWT as the rest of the app).
- **Resolution** (aligned with **Documents** tab):
  - **Digital**: [`docAvailability.js`](next-app/src/lib/docAvailability.js) — `findMatchingDocument` / `getDocAvailabilityForType` use the same rule as the staff document matrix (match `student_no` + `doc_type` on non-declined docs).
  - **Physical**: Student row `room`, `cabinet`, `drawer`; **Locate on storage map** switches to **Records & Archive** and reuses `locateStudent` so **RoomMap2D** highlights the folder.
- **Linked document (`linked_document_id`)**: On **create**, if a matching non-declined document exists, it is **auto-linked**. Opening a request **auto-links** when a file appears later. Linking is **recommended** for traceability and future analytics but is **not required** for any status (including **Ready** / **Completed**); physical release can still be tracked by status and notes alone.
- **UI**: [`DocumentRequestsTab.js`](next-app/src/components/staff/DocumentRequestsTab.js) — list (auto-refresh ~20s + on tab visibility), create, detail, status/notes, jump to SLV.

---

## 10. API conventions

- JSON responses typically `{ ok: true, data: ... }` or `{ ok: false, error: "..." }`.
- Auth-sensitive routes verify session + role before mutations.
- Prefer **no-store** client fetches for data that must reflect immediate DB changes (e.g. storage layout).

---

## 11. Environment variables

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Required for signing/verifying session tokens |
| `LOCAL_DATA_DIR` | Optional override for `.local/` (SQLite path) |

---

## 12. Commands (from `next-app/`)

```bash
pnpm dev      # development server
pnpm build    # production build
pnpm lint     # eslint
```

---

## 13. Conventions for future changes

1. **Match existing patterns** — component structure, Tailwind utility style, repo layer for DB access.
2. **Keep theme coherent** — maroon primary, `rounded-brand`, Inter, skeletons for loading.
3. **Do not remove storage locations** in use — validate via student usage or reassign data first.
4. **Universal time** — use `timeFormat.js` for user-visible timestamps.
5. **Avoid duplicate SLV sources** — staff flows must read layout from the API, not hardcoded room/cabinet lists.

---

## 14. UI patterns: lists, tables, empty states, pagination

Use these conventions when adding or refactoring data-heavy screens so they stay consistent with **Audit Logs**, **Document requests**, **Documents**, **Digital records review**, **Staff directory**, and **backup** tables.

### 14.1 Card + filter bar (same surface as the table)

- Wrap the list in a single white card: `bg-white rounded-brand border border-gray-200` (admin audit uses `border-gray-300` in places; stay consistent within a screen).
- Put **search, filters, and primary actions** in a top strip on **that same card**, not a separate card: `p-4 bg-gray-50/50 border-b border-gray-200`.
- Field labels: `text-xs font-bold text-gray-700 mb-1 uppercase`.
- Search inputs: optional leading icon `ph-bold ph-magnifying-glass` in `absolute left-3` with `pl-10` on the input.
- **Reference**: `AuditLogsTab.js`, `DocumentRequestsTab.js`, `DocumentsTab.js` (filter row + table body below).

### 14.2 Table structure

- **Header row**: `thead` with `bg-gray-50 border-b border-gray-200 sticky top-0 z-10`; column titles `text-xs uppercase tracking-wider text-gray-600`, cells `p-3 font-bold`.
- **Body**: `tbody` with `divide-y divide-gray-100` (or `divide-gray-200` to match audit).
- **Row hover**: e.g. `hover:bg-gray-50` or selection tint (`hover:bg-red-50/40` where row selection is used).
- Optional: wrap scroll area in `flex-1 overflow-auto` and only add outer `border border-gray-200` when there is data (see audit log table wrapper).

### 14.3 Empty states (tables)

Prefer an **empty row** that spans all columns so layout does not jump:

- `<tr className="border-0 hover:bg-transparent">` → `<td colSpan={N} className="p-0 border-0">` → inner column.
- Inner column: centered block, typically `h-[400px] flex flex-col items-center justify-center text-center text-gray-500`.
- **Icon**: circular badge `w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm` with a **Phosphor duotone** icon at `text-3xl text-pup-maroon` (icon choice matches context: e.g. `ph-list-magnifying-glass` for audit, `ph-tray` for requests, `ph-drawers` for archive).
- **Title**: `text-lg font-bold text-gray-900`.
- **Subtitle**: `text-sm font-medium text-gray-600 mt-1 max-w-md` (short, actionable copy).
- **Reference**: `AuditLogsTab.js` (no results / no matches copy), `DocumentRequestsTab.js` (no requests yet).

### 14.4 Empty states (non-table explorer)

- **Records & Archive** year/student explorer uses the same **circular icon + title + subtitle** pattern inside the scroll area (`py-12` or `h-full` flex center), e.g. “No students in this year” — see `RecordsArchiveTab.js`.
- First-time / no-data call-to-action screens may add a **primary Button** (maroon) under the subtitle (e.g. jump to Upload).

### 14.5 Loading states

- **In-table loading**: skeleton **rows** (`<tr>` / `<td colSpan={...}>` with `Skeleton` lines) or a grid of skeleton cells mimicking columns — avoid bare “Loading…” strings for primary lists.
- **Full-tab initial load**: structured skeleton blocks that mirror the real layout (toolbar + canvas + sidebar) — see `StorageLayoutEditorTab.js`, `SystemConfigTab.js`.
- **Modals**: skeleton placeholders for title lines and main content — see `PDFPreviewModal.js`.
- **Do not** replace the **OCR/scanning** busy state in `ScanUploadTab.js` with skeletons; keep the animated scanning treatment there.

### 14.6 Pagination (paged server lists)

Canonical footer pattern (audit logs, document requests, digital review, staff directory):

- Container: `mt-4 flex items-center justify-between`.
- **Left** (only when `total > 0`): `text-xs font-medium text-gray-500` with copy like  
  `Showing {start}-{end} of **`{total}`** {entity} entries`  
  where `{entity}` is explicit (e.g. `audit log entries`, `requests`). Use `toLocaleString()` on large totals where applicable.
- **Right**: `Button` `variant="outline" size="sm"` **Previous** with `<i className="ph-bold ph-caret-left">`, a **page chip** `px-3 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md h-8 flex items-center justify-center min-w-12 shadow-sm` showing `current / totalPages`, then **Next** with `ph-caret-right`. Disable buttons at first/last page.
- **Reference**: `AuditLogsTab.js` (baseline), `DocumentRequestsTab.js` (aligned pagination).

### 14.7 Documents matrix (staff)

- The **Documents** tab is driven by student/type filters and builds a **per-student matrix**, not a paged API list. Footer shows a simple count when filters are active: `Showing {n} documents` — see `DocumentsTab.js`. Do not force audit-style page controls unless the data model changes.

---

*Last updated: list/table UX (section 14), empty states, pagination alignment, and loading exceptions.*

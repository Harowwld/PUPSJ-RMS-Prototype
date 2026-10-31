# System Update Log: May 2026
## PUP E-Manage Records Management System

This document summarizes the major enhancements and architectural changes implemented to improve system security, operational efficiency, and user experience.

---

## 1. Backup & Disaster Recovery Enhancements

### 1.1 Immutable External Archiving (Air-Gap Strategy)
*   **Safety Policy:** Implemented an "Append-Only" rule for external drives. The web dashboard can now trigger backups and syncs, but it is strictly prohibited from deleting files on the external drive.
*   **Logic:** Deleting a backup from the dashboard only removes the local server copy and the database record, preserving the external archive as a fail-safe.

### 1.2 Automated Background Synchronization
*   **Zero-Touch Redundancy:** New backups now automatically trigger a background copy process to the external storage volume immediately upon local creation.
*   **Asynchronous Processing:** The UI remains responsive; users receive instant confirmation while the file transfer proceeds quietly in the background.

### 1.3 Real-Time UI Updates & Manual Controls
*   **WebSockets:** Integrated Socket.io to push live status updates to the Admin Dashboard. The "External Sync" status icon now updates automatically without page reloads.
*   **Manual Refresh:** Added a dedicated `REFRESH` button to the Backup History table for immediate data verification.

### 1.4 Standardized Human-Readable Naming
*   **Backups:** `PUP-RECORDS-BACKUP-YYYY-MM-DD-HHMM.zip.enc`
*   **Safety Snapshots:** `PUP-RECORDS-SAFETY-SNAPSHOT-YYYY-MM-DD-HHMM.zip.enc`

---

## 2. Security Logic & Audit Optimization

### 2.1 Simplified Account Setup (2+3 Policy)
*   **Reduced Friction:** Changed the security challenge requirement from 5 mandatory questions to **2 Required and 3 Optional**.
*   **Smart Recovery:** The "Forgot Password" system dynamically detects which questions a user has answered, only presenting the relevant challenges during identity verification.
*   **Visual Guidance:** Added clear labels and red asterisks (`*`) in both Admin and Personnel UIs to distinguish mandatory fields.

### 2.2 Global Audit Log De-duplication
*   **Centralized Strategy:** Migrated all administrative logging (Backups, User Management, Taxonomy) to the server-side APIs.
*   **Resolution:** Eliminated duplicate log entries that were previously triggered by both the browser and the server.
*   **Accuracy:** Improved IP tracking and severity reporting (e.g., automatic `WARNING` logs for partial batch failures).

### 2.3 Bulk Taxonomy & Record Imports
*   **Enhanced Reporting:** Optimized the Bulk Import backend to provide granular statistics (Added vs. Skipped) in a single audit entry.
*   **Intelligent Logging:** The system now correctly identifies duplicates during batch ingestion and logs them as non-critical informational events.

---

## 3. Infrastructure & Asset Management

### 3.1 Static Asset Restoration
*   **Fixed Font 404s:** Restored the missing `assets/` directory (Inter fonts and Phosphor icons) to the `next-app/public/` folder to ensure consistent rendering across all browsers.
*   **Directory Synchronization:** Re-aligned the root `assets/` folder with the legacy prototypes for development consistency.

### 3.2 Standardized Project Organization
*   Renamed auxiliary folders to **ALL CAPS** with an **underscore prefix** for high visibility at the top of the project structure:
    *   `_BACKUP_SPEC\`
    *   `_LEGACY_PROTOTYPE\`
    *   `_SAMPLE_DATA\`

---

## 4. UI/UX & Storage Layout Exploration Polish (May 2026)

### 4.1 Upgraded Storage Layout Map Preview
*   **AutoCAD-Inspired Style**: Re-skinned the `RoomMap2D` visualization component in the staff's Records Archive view to match the premium, professional, AutoCAD precision styling of the administrator's layout editor. Added exact background precision grids, standardized entrance markers, and detailed depth outlines to all cabinets.
*   **Double Legend Resolution**: Resolved a double legend rendering bug where both the card header and the inner layout header displayed the "Empty, Occupied, Target" key.

### 4.2 Floating Cabinet Drawer Details Overlay
*   **Uncluttered Viewport**: Removed the drawer grid list from rendering inside tiny cabinet tiles to keep the layout map completely clean and visually proportioned.
*   **Glassmorphic Floating Panel**: Replaced it with a gorgeous, absolute-positioned glassmorphic overlay modal showing drawer details (Target, Occupied, and Empty slots) with clean indicators and direct drawer selection controls.
*   **Hover-Over Auto-Hide**: Implemented an automated 2-second auto-hide timeout when the cursor hovers over the drawer modal, allowing it to easily clear out of the way so users can reveal and click on cabinets underneath. Leaving the modal cancels the countdown.
*   **Active Click Reset**: Added a click-to-reset listener to the details overlay, ensuring that clicking inside the panel (e.g., selecting a drawer) immediately restarts the 2-second countdown to keep the panel open during active use.

### 4.3 Normalized Cabinet ID Database Matching
*   **Robust Backend Matching**: Upgraded the `GET` and `PUT` validator logic inside `/api/storage-layout/route.js` to normalize cabinet IDs.
*   **Matching Resolution**: Successfully handles matching cabinet names like `C` (stored in the database) with template visual block keys like `CAB-C` (saved in the layout JSON), resolving a bug where saving the layout would fail with a false-alarm "Cannot delete occupied cabinet locations" block.

---

## 5. SuperAdmin UI Unification & Component Standardization (September 2026)

This release implements comprehensive UI/UX standardization across the SuperAdmin dashboard, modal dialogs, and component layer, following Apple Human Interface Guidelines (HIG).

### 5.1 Unified Single-Card Layout Architecture
*   **Whitespace Consolidation**: Consolidated disjointed page headers, tabs, search/filter bars, active filter chips, and tables into a single unified `<Card>` container (`rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden isolate`).
*   **Adoption Across SuperAdmin**: Applied to `CampusOperationsTab.js` (renamed from `SystemHealthTab.js`), `GlobalAuditLogsTab.js`, `SystemBackupsTab.js`, and related administrative views to eliminate scattered card fragments and reduce unnecessary vertical and horizontal spacing.

### 5.2 Apple HIG Design System Tokens
*   **Border Radius Hierarchy**:
    *   `rounded-2xl`: Outer page containers, standalone cards, modal dialog shells.
    *   `rounded-xl`: Buttons, inputs, `<Select>` dropdown triggers, squircle icon tiles (`w-10 h-10`).
    *   `rounded-lg`: Segmented control toggle buttons, dropdown menu items, table action buttons (`w-7 h-7`), active filter chips.
    *   `rounded-full`: Apple toggle switches, status pill badges, presence dot indicators.
*   **Borders & Dividers**: Replaced raw `border-black/[0.08]` and non-standard borders with `border-gray-200 dark:border-white/10` for outer boundaries and `border-gray-100 dark:border-white/10` for inner dividers.

### 5.3 Button System Conventions
*   **Text-Only Primary Buttons**: Removed static leading icons (e.g. `ph-plus`, `ph-upload-simple`) from primary calls-to-action across SuperAdmin views and Landing Page CMS to maintain clean Apple typography. Dynamic spinner icons (`ph-spinner animate-spin`) only show during active async operations.
*   **Secondary Buttons**: Replaced borderless "ghost" buttons (`variant="ghost"`) with clean outlined buttons (`variant="outline"`, `h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800`).
*   **Standardized Refresh Action (`RefreshButton.js`)**: Universal refresh actions standardized as an icon-only squircle button (`h-10 w-10 rounded-xl!` with `ph-bold ph-arrows-clockwise text-[16px]` and accessible tooltip), eliminating bulky text "Refresh" buttons that diluted header hierarchy.

### 5.4 Dropdowns & Scrollbar Rules
*   **Standardized `<Select>` Component (`@/components/ui/select`)**: Replaced custom overlay pills in the Auto Backup schedule with the unified `<Select>` component.
*   **Double Scrollbar Elimination**: Found and removed redundant `max-h-60 overflow-y-auto` from `menuClassName` on `<Select>`. Because the internal options container already manages scrolling, adding scroll classes to the outer menu created nested double scrollbars. Future AI agents must keep `menuClassName` limited to `rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5`.

### 5.5 Modal Architecture & The Negative Margin Spacing Trap
*   **Root Cause**: `<DialogFooter>` in Base UI / shadcn defaults to `-mx-4 -mb-4`. When used inside full-bleed card dialogs (`DialogContent` with `p-0` and `overflow-hidden`), this pulled the footer 16px outside the container, canceling the `p-4` padding and jamming the `Close` button flush against the bottom-right corner with zero space. Furthermore, `DialogContent` defaulted to `grid gap-4`, injecting unwanted 16px CSS grid gaps between modal sections.
*   **Resolution in `CampusOperationsTab.js` and `PDFPreviewModal.js`**:
    *   Set `flex flex-col gap-0` on `DialogContent`.
    *   Replaced `<DialogFooter>` with a dedicated `<div className="px-6 py-4 bg-white dark:bg-card border-t border-gray-100 dark:border-white/10 flex items-center justify-between">`.
    *   Standardized the `Close` button to `h-10 px-5 text-xs font-semibold rounded-xl` with generous 24px horizontal and 16px vertical padding.

---
*End of Update Log*


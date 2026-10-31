# Changelog

All notable changes to the PUPSJ-RMS-Prototype project will be documented in this file.

## [Unreleased] - Current Development Cycle

### 🎨 UI/UX & Design Polish
- **SuperAdmin Unified Single-Card Layout:** Consolidated separate cards (PageHeader, view switcher, search/filter toolbar, active filter chips, and tables) into a single unified `<Card>` container (`rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden isolate`) across SuperAdmin tabs (`CampusOperationsTab.js`, `GlobalAuditLogsTab.js`, `SystemBackupsTab.js`), reducing component separation and eliminating wasted whitespace.
- **Apple HIG Token & Border Radius Hierarchy:** Standardized border radii to `rounded-2xl` for containers, `rounded-xl` for buttons/controls/inputs, `rounded-lg` for segmented tabs/chips/table action buttons, and `rounded-full` for switches/badges. Replaced raw `border-black/[0.08]` with standard `border-gray-200 dark:border-white/10`.
- **Button System Standardization:** Standardized primary buttons to text-only (removed static leading icons across Landing Page CMS and empty states), secondary buttons to outlined (`variant="outline"`, `h-10 px-5 text-xs font-semibold rounded-xl`), and universal refresh actions to the standardized squircle `<RefreshButton>` (`h-10 w-10 rounded-xl!` with Phosphor icon and tooltip).
- **Auto Backup UI Polish & Nested Scrollbar Fix:** Standardized the recurring backup schedule UI in `AutoBackupSchedule.js` to Apple segmented tabs and `<Select>` dropdowns. Eliminated redundant `max-h-60 overflow-y-auto` from `menuClassName` on `<Select>` to prevent nested double scrollbars.
- **Modal Architecture & Corner Spacing Fix:** Resolved Base UI / shadcn `<DialogFooter>` negative margin bug (`-mx-4 -mb-4`) on full-bleed card dialogs in `CampusOperationsTab.js` and `PDFPreviewModal.js`. Replaced with dedicated `px-6 py-4` container and added `flex flex-col gap-0` to `<DialogContent>` to ensure clean button padding and eliminate corner clipping.
- **Global Aesthetic Overhaul:** Transitioned core interactive elements (e.g., primary buttons, active states) from flat colors (`bg-pup-maroon`) to rich linear gradients (`bg-linear-to-b from-red-800 to-pup-maroon`) with layered borders and shadows. This yields a more tactile, "modern" application feel.
- **Component Standardization:** Replaced native HTML `<select>` elements with a unified, custom `<Select>` component (`@/components/ui/select`) across all administrative dashboards, tables, and settings to ensure cross-browser consistency.
- **Form Focus States:** Standardized input and select focus rings, transitioning them from a harsh maroon highlight to a more subtle `border-gray-300` to reduce visual noise.
- **Enhanced Pagination Controls:** Replaced generic input-based jump pages with standardized `<Select>` dropdowns for rows-per-page, paired with explicit "Showing X out of Y" status text across all data tables (Audit Logs, Backups, Courses, Sections, DocTypes).
- **Stat Cards Redesign:** Overhauled analytics and dashboard statistic cards (e.g., in Audit Logs, Digital Records Review) with soft background hues, nuanced border colors, and improved typography.

### 🚀 Performance & Database Optimizations
- **Compliance Module Bottleneck:** Refactored the `getDigitizationComplianceSummary` SQL query in `digitizationComplianceRepo.js`. An O(N*M) correlated subquery was rewritten into an optimized `LEFT JOIN`, drastically reducing query time for large student datasets.
- **Database Indexing (Migration V19):** Added a new database migration (`sqlite.js`) to introduce the `idx_students_status` index on the `students(status)` column, accelerating active/inactive roster filtering.

### ✨ Features & Enhancements
- **Advanced Student Search & Autofill Modal:** Revamped the Document Request Creation Modal with a multi-way search input supporting lookup by both Student Name and Student Number. Autocomplete selection automatically resolves the student record and showcases a premium Student Profile card displaying their Name, Course, Year Level, Section, and exact physical drawer storage coordinates (Room, Cabinet, Drawer).
- **PUP ODRS 90-Day Retention Policy & "Shredded" Status:** Integrated the official PUP Online Document Request System (ODRS) unclaimed credentials guidelines. Processed documents marked "Ready" automatically calculate their 90-day shred schedule and display a prominent alert banner in the details panel warning staff of scheduled secure disposal. Also introduced a new `"Shredded"` request status (with custom light-rose badge styling) to log and track physical credential destruction after reaching the 90-day retention limit.
- **Staff Directory Advanced Selection:** Introduced `Shift+Click` range selection in the `StaffDirectoryTab`, allowing administrators to select multiple personnel records rapidly for bulk actions. 
- **Real-Time Presence Indicators:** Enhanced `timeFormat.js` and directory tables to intelligently interpret timestamps within a 5-minute window (and handle minor clock drift) as "Active Now", accompanied by a pulsing green status indicator.
- **System Health Node Redesign:** Upgraded the system health monitoring interface from a sliding drawer to a persistent, rich diagnostic sidebar (`HealthSidebar.js`). The new interface includes real-time telemetry gauges for Node Storage, RAM, CPU load, and a simulated Data Integrity Score.
- **Memory Diagnostics:** Expanded the `/api/system/health` endpoint to compute and broadcast host memory (RAM) consumption metrics.

### 🛠 Refactoring & Code Quality
- **Automated Style Migration Script:** Introduced `migrate-styles.mjs` to systematically hunt and replace legacy flat color classes with the new rich gradient/shadow equivalents across the entire `src/` directory.
- **Staff Directory Component Cleanup:** Extracted complex table row logic into a standalone, memoized `StaffTableRow` component, improving code readability and render efficiency during bulk operations.

# Changelog

All notable changes to the PUPSJ-RMS-Prototype project will be documented in this file.

## [Unreleased] - Current Development Cycle

### 🎨 UI/UX & Design Polish
- **Global Aesthetic Overhaul:** Transitioned core interactive elements (e.g., primary buttons, active states) from flat colors (`bg-pup-maroon`) to rich linear gradients (`bg-linear-to-b from-red-800 to-pup-maroon`) with layered borders and shadows. This yields a more tactile, "modern" application feel.
- **Component Standardization:** Replaced native HTML `<select>` elements with a unified, custom `<Select>` component (`@/components/ui/select`) across all administrative dashboards, tables, and settings to ensure cross-browser consistency.
- **Form Focus States:** Standardized input and select focus rings, transitioning them from a harsh maroon highlight to a more subtle `border-gray-300` to reduce visual noise.
- **Enhanced Pagination Controls:** Replaced generic input-based jump pages with standardized `<Select>` dropdowns for rows-per-page, paired with explicit "Showing X out of Y" status text across all data tables (Audit Logs, Backups, Courses, Sections, DocTypes).
- **Stat Cards Redesign:** Overhauled analytics and dashboard statistic cards (e.g., in Audit Logs, Digital Records Review) with soft background hues, nuanced border colors, and improved typography.

### 🚀 Performance & Database Optimizations
- **Compliance Module Bottleneck:** Refactored the `getDigitizationComplianceSummary` SQL query in `digitizationComplianceRepo.js`. An O(N*M) correlated subquery was rewritten into an optimized `LEFT JOIN`, drastically reducing query time for large student datasets.
- **Database Indexing (Migration V19):** Added a new database migration (`sqlite.js`) to introduce the `idx_students_status` index on the `students(status)` column, accelerating active/inactive roster filtering.

### ✨ Features & Enhancements
- **Staff Directory Advanced Selection:** Introduced `Shift+Click` range selection in the `StaffDirectoryTab`, allowing administrators to select multiple personnel records rapidly for bulk actions. 
- **Real-Time Presence Indicators:** Enhanced `timeFormat.js` and directory tables to intelligently interpret timestamps within a 5-minute window (and handle minor clock drift) as "Active Now", accompanied by a pulsing green status indicator.
- **System Health Node Redesign:** Upgraded the system health monitoring interface from a sliding drawer to a persistent, rich diagnostic sidebar (`HealthSidebar.js`). The new interface includes real-time telemetry gauges for Node Storage, RAM, CPU load, and a simulated Data Integrity Score.
- **Memory Diagnostics:** Expanded the `/api/system/health` endpoint to compute and broadcast host memory (RAM) consumption metrics.

### 🛠 Refactoring & Code Quality
- **Automated Style Migration Script:** Introduced `migrate-styles.mjs` to systematically hunt and replace legacy flat color classes with the new rich gradient/shadow equivalents across the entire `src/` directory.
- **Staff Directory Component Cleanup:** Extracted complex table row logic into a standalone, memoized `StaffTableRow` component, improving code readability and render efficiency during bulk operations.

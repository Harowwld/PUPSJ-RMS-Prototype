# Empty-state styling audit and implementation

Date: 2026-10-31 (Asia/Manila)

## Outcome

Implemented shared page and compact empty-state variants, direct Hugeicons imports, theme-aware typography, and standalone symbols across the portal collection views and shared panels. Following design feedback, decorative icon tiles were removed in favor of a quieter composition with more emphasis on typography and spacing. Existing contextual messages, action handlers, and permission checks were preserved, with compact fallbacks given titles and clearer supporting copy where needed.

The initial audit identified inconsistent caller markup. Implementation also uncovered global `!important` rules that flattened empty-state media and turned buttons into borderless text links. Those rules masked several caller-level differences, so the initial markup findings should not be read as descriptions of the previously rendered appearance. The obsolete CSS and icon-cloning overrides have both been removed.

## Completed remediation

| Finding | Implementation |
|---|---|
| Forced icon size/color | `EmptyMedia` no longer clones children or writes inline icon styles. Explicit sizes, classes, and styles remain intact. |
| Legacy icon references | Empty-state media uses direct named imports from `hugeicons-react`. The app-wide legacy `HugeIcon` adapter and Phosphor/Tabler class aliases were removed in the 2026-11-02 migration. |
| Repeated geometry | Page symbols are 48px and compact symbols are 28px, with no enclosing tile, background, border, or shadow. |
| Decorative pulses and large shadows | Empty-state halos and icon-tile shadows were removed. Loading indicators retain their existing behavior. |
| Typography drift | Shared semibold titles and normal-weight secondary descriptions replace caller-level typography overrides. Both have light/dark colors and long-text wrapping. |
| Inconsistent compact fallbacks | Sheet lists, attachments, document previews, recovery questions, charts, search dialogs, storage selection/history, and kanban stage emptiness use the shared components. Functional kanban drop-target borders remain. |
| Public catalog fallback | The catalog uses the compact variant with availability-specific copy. |
| Button appearance and overflow | Standard primary/outlined variants now render normally. Empty action slots hide; direct action buttons and links wrap within the available width. |
| Missing documentation | `COMPONENT_STANDARDS.md` section 5.10 defines the variants. `AGENTS.md` documents Hugeicons and replaces its legacy table-empty-state example. |

## Shared contract

Use `EmptyState` for a title, optional Hugeicons component, description, and optional action children. Compose `Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, and `EmptyContent` when conditional markup needs it.

| Property | Page / table (default) | Compact |
|---|---|---|
| Container | `px-6 py-12 min-h-[360px] flex-1` | `px-4 py-6 min-h-0 flex-none` |
| Standalone icon | 48px, no enclosing surface | 28px, no enclosing surface |
| Title | `text-xl font-semibold leading-tight` | `text-sm font-semibold` |
| Description | `text-sm font-normal` | `text-xs font-normal` |
| Description colors | `text-gray-500 dark:text-zinc-400` | Same |

The app customizes the radius scale: `rounded-xl` currently computes to 16.8px at the default root font size. Button checks compare against the actual token rather than assuming Tailwind's default 12px radius. Empty-state symbols have no enclosing rounded surface.

Zero records, zero matches, errors, and no selection remain separate states. Dropdown no-results messages, small numeric/status fallbacks, loading skeletons, upload dropzones, and warning banners retain their contextual behavior. This implementation does not migrate every icon elsewhere in the application.

## Validation

- Production build: `pnpm build` passed, compiling all routes and generating 91 static pages. Nine filesystem-tracing warnings were reported in existing server routes.
- Regression tests: `node --test test/empty-state.test.mjs` passed (3 tests). They cover explicit icon style preservation, compact height behavior, conditional recovery actions, and escaped query text.
- Browser fixtures cover page, compact, error, and long-text/action cases in light/dark themes at 1440px and 320px. Checks verify standalone icon sizes, absent icon backgrounds/borders/shadows, typography, button radius tokens, outlined/primary button appearance, keyboard order, decorative media semantics, overflow, and idle animation.
- Browser fixtures use the real UI modules, the project's Jakarta font, and application CSS compiled through the same Tailwind/PostCSS plugin as Next.js. They do not authenticate or mutate application data.
- Scoped ESLint found two `react-hooks/set-state-in-effect` errors in `src/app/student/page.js`; both are also present in HEAD. Existing hook-dependency and image-element warnings remain. New component and test code passes targeted lint.
- `git diff --check` passed.

Browser artifacts are in `next-app/.local/empty-state-qa/` (`light-1440.png`, `dark-1440.png`, `light-320.png`, `dark-320.png`, and `metrics.json`). To rerun against a running local app, use `node e2e/empty-states.browser.mjs`. The script also accepts `TEST_CSS_FILE` for independently compiled application CSS.

## Route coverage and limits

All eight page entry points were reviewed in source: `/`, `/login`, `/forgot-password`, `/account`, `/admin`, `/staff`, `/systemadmin`, and `/student`. Collection and selection states live primarily in the tab and shared components below; login/recovery forms and the account redirect are not collection views.

The production build verifies route compilation; browser checks verify shared presentation fixtures. Every authenticated tab and data condition was not exercised end to end. No full-app screen-reader or contrast certification is claimed. Unrelated pre-existing worktree changes were preserved.

## Current shared-component inventory

50 consuming source files use the shared empty-state components. Locations below identify the first rendered empty component in each file.

| Source file | First usage |
|---|---:|
| `next-app/src/app/student/page.js` | 1760 |
| `next-app/src/components/admin/BackupTab.js` | 397 |
| `next-app/src/components/admin/DigitalRecordsReviewTab.js` | 1181 |
| `next-app/src/components/admin/DigitizationComplianceTab.js` | 1140 |
| `next-app/src/components/admin/OSASOrganizationComplianceView.js` | 1554 |
| `next-app/src/components/admin/RateLimitingTab.js` | 225 |
| `next-app/src/components/admin/SLAAnalyticsTab.js` | 499 |
| `next-app/src/components/admin/StaffDirectoryTab.js` | 798 |
| `next-app/src/components/admin/SystemConfigTab.js` | 994 |
| `next-app/src/components/admin/analytics/SlaCharts.js` | 268 |
| `next-app/src/components/admin/analytics/SlaKpiCards.js` | 369 |
| `next-app/src/components/admin/audit-logs/LogTable.js` | 279 |
| `next-app/src/components/admin/backup/BackupTable.js` | 113 |
| `next-app/src/components/admin/storage-layout/CabinetSidebar.js` | 99 |
| `next-app/src/components/admin/system-config/CoursesTab.js` | 403 |
| `next-app/src/components/admin/system-config/DocTypesTab.js` | 444 |
| `next-app/src/components/admin/system-config/RecognitionTemplatesTab.js` | 778 |
| `next-app/src/components/admin/system-config/SectionsTab.js` | 421 |
| `next-app/src/components/landing/DocumentCatalog.js` | 335 |
| `next-app/src/components/layout/Header.js` | 1370 |
| `next-app/src/components/shared/AccountSettingsPanel.js` | 1086 |
| `next-app/src/components/shared/AccountSetupModal.js` | 506 |
| `next-app/src/components/shared/FileAttachmentDropzone.jsx` | 726 |
| `next-app/src/components/shared/MyActivityPanel.js` | 500 |
| `next-app/src/components/shared/PDFPreviewModal.js` | 295 |
| `next-app/src/components/shared/Sidebar.js` | 2093 |
| `next-app/src/components/staff/BatchReviewTab.js` | 591 |
| `next-app/src/components/staff/DocumentRequestsTab.js` | 1044 |
| `next-app/src/components/staff/DocumentsTab.js` | 1083 |
| `next-app/src/components/staff/NotificationsTab.js` | 668 |
| `next-app/src/components/staff/OfficeDocumentsTable.js` | 105 |
| `next-app/src/components/staff/OsasKanbanPipeline.js` | 605 |
| `next-app/src/components/staff/OsasMonitoringTab.js` | 1377 |
| `next-app/src/components/staff/RecordsArchiveTab.js` | 1140 |
| `next-app/src/components/staff/RegistrarODRSTab.js` | 252 |
| `next-app/src/components/staff/ScanUploadTab.js` | 600 |
| `next-app/src/components/staff/StudentDirectoryTab.js` | 1146 |
| `next-app/src/components/staff/StudentDriveFilesView.js` | 237 |
| `next-app/src/components/staff/StudentOrganizationsTab.js` | 1681 |
| `next-app/src/components/staff/StudentProfileSheet.js` | 722 |
| `next-app/src/components/staff/requests/DocumentRequestDetailSheet.js` | 552 |
| `next-app/src/components/student/StudentComplianceTab.js` | 965 |
| `next-app/src/components/student/StudentOverviewTab.js` | 711 |
| `next-app/src/components/systemadmin/CampusOperationsTab.js` | 612 |
| `next-app/src/components/systemadmin/GlobalAuditLogsTab.js` | 950 |
| `next-app/src/components/systemadmin/GlobalStaffTab.js` | 1114 |
| `next-app/src/components/systemadmin/ModuleConfigTab.js` | 660 |
| `next-app/src/components/systemadmin/OfficeDetailSheet.js` | 637 |
| `next-app/src/components/systemadmin/OfficeManagementTab.js` | 1099 |
| `next-app/src/components/systemadmin/SystemBackupsTab.js` | 872 |

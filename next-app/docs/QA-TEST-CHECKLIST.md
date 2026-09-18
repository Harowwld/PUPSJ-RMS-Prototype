# PUP E-Manage QA Test Checklist

Use this checklist for a complete manual QA pass of the local PUPSJ Records Management System. It is organized by user role and source component so every visible control, dialog, sheet, workflow, and data state has an owner.

## How to record a result

For every applicable checkbox, record:

- **Result:** Pass, Fail, Blocked, or Not applicable.
- **Evidence:** URL, role/account, test record ID or filename, expected result, actual result, screenshot/video, and browser-console error if any.
- **Defect:** one defect per unexpected behavior. Include reproduction steps and whether it can cause data loss, cross-office access, or an incorrect audit log.

Do not mark a flow passed merely because its button responds. A save, upload, status change, download, or deletion passes only after a refresh or a fresh login proves the server-side result persisted.

## Test setup and test data

Run from `next-app/` before a fresh test cycle:

```bash
docker compose up -d --wait postgres
pnpm db:migrate
pnpm db:seed:sample
pnpm db:verify
pnpm dev
```

Use a private browser window or separate browser profiles for each role. Do not perform destructive checks against shared demonstration data unless the test run is explicitly disposable.

| Persona | Sign-in identifier | Expected workspace |
| --- | --- | --- |
| SuperAdmin | `superadmin@pup.local` | `/systemadmin` |
| Registrar Admin | `admin.registrar@pup.local` | `/admin` |
| Registrar Staff | `staff.registrar@pup.local` | `/staff` |
| OSAS Admin | `admin.osas@pup.local` | `/admin` with OSAS-scoped data |
| Student | `student@pup.local` or `2022-10001-MN-1` | `/student` |

Prepare: one valid PDF, one valid image where the upload accepts images, one invalid extension, one oversized file where practical, a CSV with valid rows, a CSV with one invalid row, a duplicate student number, a duplicate document, and a known requester/proposal/document for preview and status changes.

## Universal acceptance criteria

Apply these checks to **every button, icon button, link, row action, tab, select, checkbox, file picker, pagination control, and form submit** in the component matrix below.

- [ ] The control is visible only to the correct authenticated role and office.
- [ ] Its label, tooltip, icon, and disabled/loading state make the action clear.
- [ ] Mouse click, keyboard Tab then Enter/Space, and focus indicator work.
- [ ] One activation performs the intended action once. Repeated rapid clicks do not create duplicate records, uploads, requests, backups, or logs.
- [ ] While a request is pending, the control prevents duplicate submission and surfaces progress.
- [ ] Success produces a clear confirmation and the changed list/count/detail persists after refresh.
- [ ] Failure retains safe user input where appropriate, shows a useful message, and does not report success.
- [ ] The control remains usable at desktop and narrow mobile widths, in light and dark themes when available.
- [ ] The browser console and network panel contain no uncaught error, failed request, or unexpected redirect.

### Tables, filters, and exports

- [ ] Search supports partial names, IDs, filenames, and no-result input as relevant to the table.
- [ ] Every filter, quick-range, date range, and status/role selector changes the list correctly and can be cleared.
- [ ] Every sortable column toggles ascending then descending order, with an accurate visual state.
- [ ] Pagination cannot go below page 1 or past the final page. Page size, page jump, and total count agree with visible data.
- [ ] Selecting rows, select-all, bulk-action enablement, and deselection behave correctly across filters/pages.
- [ ] CSV/PDF export contains the currently intended scope and does not expose another office's data.
- [ ] Empty, loading, error, and populated states all render without clipped controls or stale counts.

### Dialogs, sheets, and confirmations

Run these checks for every modal/sheet in the modal inventory.

- [ ] Opening control opens the correct dialog with the expected title and target record.
- [ ] Initial keyboard focus is inside; focus does not escape while open; Escape and close/cancel return focus to the trigger.
- [ ] Overlay click behavior matches the risk: destructive or required-setup dialogs must not silently discard/confirm work.
- [ ] Required fields, format rules, duplicate checks, and confirmation text block invalid submission with a specific error.
- [ ] Cancel/close creates no data change. Confirm/save creates exactly the requested change once.
- [ ] Long content is scrollable, footer actions remain reachable, and mobile layout has no hidden or overlapping controls.
- [ ] Re-open after completion/error shows current data rather than stale form values.

### Security and session boundaries

- [ ] Unauthenticated access to each protected page/API redirects or returns unauthorized without leaking data.
- [ ] Staff cannot access admin/system-admin features; students cannot access staff data.
- [ ] Registrar and OSAS users cannot preview, edit, download, request, scan, or enumerate the other office's documents.
- [ ] Logout clears access. Browser Back and bookmarked protected URLs do not restore a usable session.
- [ ] Inactive/archived account behavior is blocked and explained without exposing account details.
- [ ] Sensitive success/failure actions create the expected audit/activity record without recording passwords, answer text, TOTP secrets, or file contents.

## Public landing and sign-in

### Landing page, `src/app/page.js` and `components/landing/*`

> Current-revision note: `components/landing/PublicTracker.js` is not imported by `src/app/page.js`. Treat the tracker checks below as **Not applicable** until the component is wired into a public route; record the checked-out revision as evidence.

- [ ] Navbar links scroll/navigate to an existing section and mobile navigation opens, closes, and traps no focus.
- [ ] Hero CTA, office-directory actions, document catalog, workflow cards, footer links, FAQ accordion, and public request tracker work.
- [ ] Public tracker accepts a valid reference, handles an unknown reference safely, and never reveals another student's private request details.
- [ ] Catalog search/filter, document-card selection, and empty states behave correctly.
- [ ] CMS-managed hero, bento, workflow, FAQ, catalog, and footer content render safely when fields are missing, long, or contain special characters.

### Sign-in, registration, recovery, and 2FA, `src/app/login/page.js`, `src/app/forgot-password/page.js`

- [ ] Personnel login: valid credentials route to the correct dashboard; invalid email/password is rejected without account enumeration.
- [ ] Two-step login: email step, Back action, password visibility toggle, loading state, and Enter-key submit work.
- [ ] Demo-account drawer/pills fill only the intended credentials; copy-password action works and does not auto-submit unexpectedly.
- [ ] TOTP challenge accepts valid current code, rejects invalid/expired code, supports cancel, and cannot be bypassed by URL navigation.
- [ ] Student login accepts supported identifier formats and routes to `/student`; invalid credentials remain on the sign-in page.
- [ ] Student registration validates required names/email/password confirmation, duplicate account, weak/invalid input, and successful sign-in afterward.
- [ ] Forgot-password identify, security-question answer, reset-password, Back, Cancel, expired/invalid token, mismatched passwords, and success path work.
- [ ] Password show/hide buttons preserve input value and do not expose the password in logs or copy fields.

## Shared shell and account features

### Header, sidebar, help, theme, and refresh

- [ ] Header: logo/home, sidebar toggle, account menu, theme control, user guide, profile/activity links, and logout each work from every dashboard.
- [ ] Sidebar: every visible navigation item opens the matching view, highlights correctly, survives refresh/deep link, and respects role/office module access.
- [ ] Sidebar zoom track and zoom in/out/reset controls remain bounded and work with mouse/touch without selecting page text.
- [ ] Refresh buttons reload current data once, show loading state, and preserve valid current filters where intended.
- [ ] Theme persists according to the selected preference and all visible controls remain readable in both themes.
- [ ] User Guide modal tabs, close button, Escape, and scroll behavior work.

### Account profile, security, and activity

- [ ] Profile tab loads current account fields; edit/save validates names and persists after refresh.
- [ ] Avatar choose, preview, invalid type/size rejection, replace, remove, and reload work.
- [ ] Change-password validates current password, mismatch, weak password, incorrect current password, and a successful next sign-in.
- [ ] Security-question setup/edit saves required answers, rejects missing required answers, and supports recovery afterward.
- [ ] TOTP enrollment displays QR/secret only to the account owner, verifies a valid code, rejects invalid code, cancels safely, disables only after confirmation, and invalidates/updates recovery-code state correctly.
- [ ] Recovery-code dialog copy/download/close controls work; generated codes are one-time and are not shown again after reload unless the workflow explicitly permits it.
- [ ] Preferences controls save and restore correctly.
- [ ] My Activity: KPI cards, search, severity tabs, date shortcuts, clear filters, sort, row expand, details sheet, copy actions, pagination, CSV download, PDF preview/fullscreen/download, and refresh work.

## Registrar Staff workspace, `/staff`

### Navigation and core records

- [ ] Visit each permitted view: Document Requests, OSAS Monitoring, Scan & Upload, Batch Review, Documents, Notifications, Records & Archive, Student Directory, and Storage Explorer.
- [ ] Direct `?view=` links select only an allowed view; invalid view values safely fall back.
- [ ] Quick search returns correct office-scoped matches and opening a result shows the correct student/document.

### Student Directory and student dialogs

- [ ] Register Student modal: required fields, course/section dependency, valid storage location, duplicate student number, cancel, create, and refreshed table row.
- [ ] Edit Student modal: prefilled values, validation, save/cancel, and changed details after refresh.
- [ ] Student Profile modal/sheet: opened from each row action, displays correct student and document history, and closes cleanly.
- [ ] Student row actions: view, edit, locate in storage, archive, restore, selection checkbox, and disabled state for already archived/active records.
- [ ] Bulk archive/restore confirmation lists the intended students only, requires confirmation, and updates records/counts after refresh.
- [ ] Directory KPI cards, search, course/year/status filters, filter chips, clear/reset, sorting, pagination, and CSV export work.

### Scan, upload, OCR, and batch review

- [ ] Scan & Upload PDF/image mode switch updates allowed inputs and validation.
- [ ] Drag-and-drop, browse file picker, multi-file queue, queue selection/removal, rotation, and file metadata display work.
- [ ] Reject unsupported, corrupt, empty, and oversized uploads without creating a document.
- [ ] Existing-student lookup and new-record fields correctly validate student number, course, section, storage room/cabinet/drawer, and document type.
- [ ] OCR start, spinner, no-engine error, unreadable file, suggested match, manual override, confidence display, and OCR prompt actions work.
- [ ] Duplicate-document warning identifies the correct duplicate; Cancel preserves state and Confirm follows the intended replacement/continue rule exactly once.
- [ ] Successful upload creates an office-scoped document, file preview works, and the document appears after refresh.
- [ ] CSV student/document import accepts valid rows, reports row-level errors, permits selection, applies bulk storage assignment, and does not import invalid/unselected rows.
- [ ] Continuous scanner shows queued/processing/succeeded/failed totals, bounded progress, open-review action, retry behavior, and safe empty state.
- [ ] Batch Review filters, selection, preview, candidate list, retry, confirm/promote, reject, pagination, and refreshed item state work.
- [ ] Promotion requires exactly one eligible student match and preserves source/review data according to the workflow; rejected/failed items are not silently promoted.

### Registrar document, request, archive, storage, and notification workflows

- [ ] Documents matrix/list: search, filters, sort, pagination, preview, download where available, and status display work.
- [ ] Document Requests: create, edit/update status, notes, requester lookup, linked-document selection, status transitions, confirmation, and request history work.
- [ ] Registrar ODRS: request form fields, duplicate/invalid input, submit, status timeline, details, and cancellation rules work.
- [ ] Records & Archive: year navigation, breadcrumb, student opening, document preview, back navigation, no-result, and archived/active record distinctions work.
- [ ] Storage Explorer: room/cabinet/drawer navigation, student/document location, locate action from directory, and no-location state work.
- [ ] Notifications: unread count, filters, sort, mark read/unread, archive/unarchive, bulk actions, links to target records, pagination, and empty state work.

### OSAS Monitoring within staff workspace

- [ ] Proposal list/card filters, search, pagination, and status counters are correct.
- [ ] Proposal preview opens the correct PDF and does not permit Registrar staff to access unrelated OSAS-only actions.
- [ ] Review/status actions enforce the staff role and show current timeline/notes after refresh.

## Registrar and OSAS Admin workspace, `/admin`

### Administrative navigation and staff directory

- [ ] Visit Directory, Digital Records Review, Digitization Compliance, Request Analytics, Storage Layout, System Data, System, and Audit Logs.
- [ ] Register Account dialog validates ID, names, email, role, section/office, duplicates, cancel, submit, and the new account's initial sign-in path.
- [ ] Edit User dialog loads correct data; save/cancel/close and status changes persist.
- [ ] Staff row actions, search, filters, sort, pagination, archive, restore, delete, and bulk archive/restore confirmations target only selected staff.
- [ ] OSAS Admin sees only OSAS records and supported OSAS functions; Registrar Admin sees only Registrar data except globally authorized surfaces.

### Digital records review and compliance

- [ ] Digital Records Review filters pending/approved/declined records correctly; preview opens the selected file.
- [ ] Approve/decline dialog requires a valid choice/note where required, prevents duplicate review, updates reviewer/time/status, and persists after refresh.
- [ ] Digitization Compliance filters/sorts records, KPI cards, charts, row detail dialog, calculation/refresh actions, exports, and no-data state work.
- [ ] SLA/Request Analytics filters, KPI cards, chart tooltips, chart-to-view links, details dialog, CSV/PDF export, and no-data state work.

### Storage Layout editor and conflicts

- [ ] Room/cabinet/drawer creation, rename, move/resize/rotate where provided, selection, drawer edits, delete, undo/reset, and save work.
- [ ] Canvas mouse and touch operations stay inside bounds and do not corrupt layout after refresh.
- [ ] Every destructive layout action shows the correct ConfirmModal target; Cancel leaves the layout unchanged.
- [ ] PromptModal input validation handles empty/duplicate/invalid room or cabinet identifiers.
- [ ] Conflict resolution, apply preview, apply report, and replacement/merge options clearly identify impacted student locations and persist the selected outcome only.

### System data and recognition configuration

- [ ] Courses, Sections, and Document Types: add, edit, archive/restore/delete as available, duplicate prevention, search/filter/sort/pagination, and related-record restrictions.
- [ ] DocTypeModal shows correct title and saves/cancels without stale values.
- [ ] Bulk Import accepts valid file, previews validation results, imports only eligible rows, reports failures, and is idempotent on retry.
- [ ] PSA Recognition Templates: type selection, PDF/image load, field selection, draw/clear normalized regions, save/update/delete template, preview/OCR matching, and missing OCR engine behavior work.

### Backup, health, rate limiting, and audit logs

- [ ] Backup create, refresh, search/date filters, pagination, status display, download, sync external, schedule create/edit/toggle, and schedule validation work.
- [ ] Restore remains unavailable or follows the displayed controlled workflow. It must never present a false successful restore.
- [ ] Backup delete requires the displayed typed confirmation and removes only intended backup metadata/file. Cancel must preserve it.
- [ ] External-drive connected/disconnected dialogs show the current drive state and do not treat a stale drive path as available.
- [ ] Health view loads database/disk/memory values, handles unavailable services, and refreshes without stale error state.
- [ ] Rate-limit controls list current rules, validate updates, clear lockouts only after confirmation, and verify login/forgot-password limits behave as configured.
- [ ] Audit logs: KPI cards, filters, mine-only, dates, sort, pagination, expanded row, copy fields, detail sheet, PDF preview, and CSV/PDF export work.

## SuperAdmin workspace, `/systemadmin`

### Offices, modules, staff, and governance

- [ ] Departments & Stations: create/edit office, archive/restore, office detail, search/filter/sort/grid/list toggle, module links, and confirm dialogs work.
- [ ] Department Features: office selection, module matrix/card views, enable/disable toggle, loading/error rollback, archived-office restrictions, filters, search, sort, and pagination work.
- [ ] Global Directory: create/edit staff, reset/change password dialog, archive/restore/delete, bulk actions, filters, sort, pagination, and office assignment work.
- [ ] Security Questions: add/edit/reorder/required toggle/delete as supplied, duplicate/empty validation, impact warning, save, and recovery-flow compatibility work.
- [ ] Campus Operations: KPI cards, filters, sort, row detail/actions, status changes, pagination, and no-data state work.
- [ ] Platform Audit Trail: filters, severity/date range, sort, row details, copy/export/PDF actions, pagination, and global access boundaries work.
- [ ] System Backups: same backup, schedule, drive, download, and destructive-confirmation checks as Admin, with SuperAdmin authorization verified.

### Landing Page CMS

For each CMS view, test load, edit fields, add/remove/reorder where available, preview/open public page, save, reset confirmation, validation, error handling, and a browser refresh that proves persistence.

- [ ] Landing Hero: heading, copy, CTA text/link, media/brand fields, and reset.
- [ ] Landing Bento: header, each editable card, accordions/tabs, preview tabs, save, and reset.
- [ ] Landing Catalog: document entries, ordering, publish/visibility fields, save, reset, and public catalog result.
- [ ] Landing Workflow: workflow steps, tags, add/remove/reorder, save, reset, and public workflow result.
- [ ] Landing FAQ: question/answer add/edit/delete/reorder, empty question validation, save/reset, and public accordion behavior.
- [ ] Landing Footer: office/contact/link fields, invalid/missing URL behavior, save/reset, and public links.

## Student workspace, `/student`

- [ ] Student dashboard loads only the signed-in student's requests, documents, proposals, activity, and compliance information.
- [ ] ODRS request form validates document type, notes, client type, course where shown, duplicate rules, submit, success feedback, and refreshed request history.
- [ ] Request History search, status filter, sorting, pagination, row/detail sheet, and status timeline work.
- [ ] Student cannot change server-controlled request status, student number, or another student's request through UI, URL, or intercepted request.
- [ ] Event Proposal form validates title, organization, event date, PDF requirement, invalid/oversized file, submit, and refreshed proposal list.
- [ ] Proposal details, status/review note, activity timeline, PDF preview/fullscreen/close, and download restrictions work.
- [ ] Student Compliance tab loads correct requirements/status, filters/actions, empty/loading/error states, and does not show staff-only controls.
- [ ] Student sidebar/header/account/logout actions follow the shared-shell checks.

## Modal and sheet inventory

Use the shared dialog checks for each item below. This inventory prevents a modal from being skipped because its trigger appears only after data exists.

| Surface | Modal, sheet, or dialog to exercise |
| --- | --- |
| Shared | AccountSetupModal, DefaultPasswordModal, ConfirmModal, PromptModal, DocTypeModal, PDFPreviewModal, TOTPChallengeModal, UserGuideModal |
| Account | recovery-codes dialog, profile avatar picker, TOTP setup/disable flows |
| Staff | RegisterStudentModal, EditStudentModal, StudentProfileModal, StudentProfileSheet, OCRPromptModal, duplicate-upload confirmation, archive/restore confirmations |
| Staff requests/docs | request detail/status dialogs, document preview, batch-review detail/preview/reject/confirm dialogs |
| Admin staff | RegisterAccountTab dialog, EditUserModal, archive/restore/delete/bulk confirmations |
| Admin review/analytics | document review dialog, compliance row detail, SLA detail, audit LogDetailSheet, audit PDF preview |
| Admin storage | room/cabinet/drawer prompts, delete/reset/save confirmations, ConflictResolutionModals: conflict, apply preview, apply report |
| Admin taxonomy | course, section, document-type add/edit/archive/delete dialogs; bulk-import validation/result dialogs; recognition template load/save/delete dialogs |
| Backup/system | backup delete typed-confirmation, restore confirmation, external-drive state, backup schedule dialogs, clear-lockout confirmation |
| SuperAdmin | office create/edit/archive, module assignment, GlobalStaff create/edit/password, security-question, campus-operation, CMS reset dialogs |
| Student | request detail sheet, event-proposal detail sheet, PDF preview |
| Landing | public tracker result/error and mobile navigation |

## Source coverage matrix

This is the auditable source inventory. Test every control exposed by each component, using the universal criteria and the role workflow above. A component can be marked N/A only when the authenticated role/module configuration genuinely does not render it.

| Area | Source components covered |
| --- | --- |
| Public | `LandingNavbar`, `LandingHero`, `OfficeDirectory`, `DocumentCatalog`, `DocumentCardPreview`, `ProcessWorkflow`, `FAQSection`, `PublicTracker`, `LandingBento`, `LandingFooter`, `LandingStats` |
| Shared | `Header`, `Footer`, `Sidebar`, `PageHeader`, `RefreshButton`, `FloatingActionBar`, `ConfirmModal`, `PromptModal`, `DocTypeModal`, `PDFPreviewModal`, `UserGuideModal`, `AccountSetupModal`, `DefaultPasswordModal`, `TOTPChallengeModal`, UI `Select`, `Tabs`, `Dialog`, `Sheet`, `Tooltip`, `Calendar` |
| Staff | `StudentDirectoryTab`, `RegisterStudentModal`, `EditStudentModal`, `StudentProfileModal`, `StudentProfileSheet`, `ScanUploadTab`, `OCRPromptModal`, `ContinuousScanningPanel`, `BatchReviewTab`, `DocumentsTab`, `OfficeDocumentsTable`, `DocumentRequestsTab`, `RegistrarODRSTab`, `OsasMonitoringTab`, `RecordsArchiveTab`, `StorageExplorerTab`, `RoomMap2D`, `NotificationsTab` |
| Admin | `StaffDirectoryTab`, `RegisterAccountTab`, `EditUserModal`, `DigitalRecordsReviewTab`, `DigitizationComplianceTab`, `SLAAnalyticsTab`, `StorageLayoutEditorTab`, `CabinetCanvas`, `CabinetSidebar`, `ConflictResolutionModals`, `SystemConfigTab`, `CoursesTab`, `SectionsTab`, `DocTypesTab`, `BulkImportTab`, `RecognitionTemplatesTab`, `BackupTab`, `AutoBackupSchedule`, `BackupTable`, `BackupFilters`, `BackupPagination`, `HealthSidebar`, `RateLimitingTab`, `AuditLogsTab`, `LogFilters`, `LogTable`, `LogPagination`, `LogDetailSheet`, `PdfPreviewDialog` |
| SuperAdmin | `OfficeManagementTab`, `ModuleConfigTab`, `GlobalStaffTab`, `SecurityQuestionsTab`, `CampusOperationsTab`, `GlobalAuditLogsTab`, `SystemBackupsTab`, `LandingPageCmsTab`, `LandingBentoCmsView`, `LandingCatalogCmsView`, `LandingWorkflowCmsView`, `LandingFaqCmsView`, `LandingFooterCmsView` |
| Student | `StudentComplianceTab`, student dashboard request/proposal/activity/detail/PDF surfaces |

### Per-control manifest, required for every QA run

The matrix groups the current feature set. Before testing, capture the exact control manifest from the checked-out revision so newly added controls cannot be missed.

```bash
rg -n --glob '*.{js,jsx}' '<button|<Button|<Dialog|<Sheet|<Select|<Tabs|<input|<textarea' src/app src/components
pnpm audit:buttons
```

- [ ] Attach both command outputs to the QA run.
- [ ] Test every interactive source line in the manifest, or record the specific role/module/data precondition that makes it Not applicable.
- [ ] For shared/reused controls, record each distinct rendered context. For example, a PDF preview must be checked from documents, requests, audit logs, batch review, OSAS proposals, and the student portal.
- [ ] Re-run the manifest after every UI change and add any newly reported control to the current regression run.

## Cross-browser, responsive, and failure pass

- [ ] Repeat a representative workflow from each persona in current Chrome and Safari on macOS.
- [ ] Repeat landing, sign-in, one table, one form, one dialog, file upload, and sidebar on a narrow viewport (320-430 px) and tablet width.
- [ ] Test slow/offline network during login, list loading, save, upload, preview, export, and logout. The UI must not claim completion without server confirmation.
- [ ] Reload midway through a non-destructive form and a destructive confirmation. Verify no unintended mutation occurs.
- [ ] Test empty database/module-disabled/no-permission states without blank screens or broken navigation.
- [ ] Run `pnpm lint`, `pnpm build`, `pnpm test:recognition`, `pnpm test:security`, `pnpm audit:buttons`, and `pnpm audit:empty-states`; attach results to the QA report.

## Completion gate

The QA cycle is complete only when all applicable checkboxes have evidence, all critical/high defects are resolved and retested, and this summary is signed off:

| Check | Result | Evidence link / defect IDs | Tester | Date |
| --- | --- | --- | --- | --- |
| Public and authentication |  |  |  |  |
| Shared shell, account, accessibility |  |  |  |  |
| Registrar Staff workflows |  |  |  |  |
| Registrar Admin workflows |  |  |  |  |
| OSAS Admin workflows |  |  |  |  |
| SuperAdmin workflows |  |  |  |  |
| Student workflows |  |  |  |  |
| Modal/sheet inventory |  |  |  |  |
| Cross-office authorization |  |  |  |  |
| Responsive/cross-browser/error states |  |  |  |  |
| Automated checks |  |  |  |  |

# QA Execution Report, 2026-09-16

## Scope and outcome

This report records the executed portion of `QA-TEST-CHECKLIST.md` against the local PostgreSQL sample dataset. The full manual click-through is **not complete**, but representative browser checks were completed in Safari.

No application source was changed during this run. The pre-existing staged change in `src/lib/ingestBatchProcessor.js` was left untouched.

## Environment

- Database: Docker Desktop, local PostgreSQL container `pupsj-rms-postgres`, healthy.
- Application: Next.js 16.1.6.
- Seed result: 25 students, 40 documents, 6 document requests, 10 event proposals, 10 rooms, 80 cabinets, and 320 drawers.
- Browser click-through: Safari on macOS, local `http://localhost:3000`.

## Passed evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Database migration | Pass | `pnpm db:migrate` completed. |
| Sample data seed | Pass | `pnpm db:seed:sample` completed with the counts above. |
| PostgreSQL invariants | Pass | `pnpm db:verify` passed: 47 migrations, 2 offices, 16 modules, 4 staff, expected seeded records. |
| Recognition unit tests | Pass | `pnpm test:recognition`: 5 passed, 0 failed. |
| Security test command | Pass, no coverage | `pnpm test:security` exited 0 but discovered 0 tests. This is not evidence of security-test coverage. |
| Lint | Pass with warnings | `pnpm lint` exited 0 with 30 warnings, primarily `img` optimization and React hook dependency warnings. |
| Production build | Pass | `pnpm build` compiled and generated all 76 routes. |
| Supported local dev startup | Pass | `pnpm dev` started Docker, migrations, the hot-folder watcher, and Next.js with Webpack. `/`, `/login`, `/forgot-password`, `/student`, `/staff`, `/admin`, `/systemadmin`, `/account`, and `/account/activity` each returned HTTP 200. Unauthenticated `/api/system/health` returned the expected 401. |
| Personnel authentication | Pass | SuperAdmin, Registrar Admin, Registrar Staff, and OSAS Admin all returned HTTP 200 from `POST /api/auth/login`. |
| Student authentication | Pass | Seeded student returned HTTP 200 from `POST /api/auth/student/login`. |
| Current-session lookup | Pass | Each of the five authenticated sessions returned HTTP 200 from `GET /api/auth/me` with its expected role/scope. |
| Basic role boundaries | Pass | Unauthenticated `/api/students` returned 401; Staff `/api/staff` returned 403; Student `/api/students` returned 403; Registrar Admin `/api/offices` returned 403; SuperAdmin `/api/offices` returned 200; Staff global audit logs returned 403; SuperAdmin global audit logs returned 200. |
| Office data scoping | Pass | Registrar and OSAS document lists returned only their own office's documents. Cross-office document read and file preview both returned 404. Registrar access to OSAS proposals returned 403; OSAS Admin returned 200. |
| Student data boundary | Pass | Seeded student received 200 for own request/compliance endpoints and 401 for staff document endpoint. |
| Logout invalidation | Pass | Student logout returned 200, then the same cookie returned 401 from `/api/auth/me`. |
| Browser Back after logout | Pass | After signing out of the Registrar Staff account in Safari, browser Back did not restore the protected staff workspace; the user remained on the public landing page. |
| Invalid sign-in handling | Pass | Personnel login returned the identical `400 {"ok":false,"error":"Invalid input"}` response for an unknown email and for a known account with an incorrect password. Invalid student credentials returned 401 without a session. |
| Public landing page | Pass | Safari rendered the full landing page: navigation, request CTAs, service catalog, carousel controls, and footer contact links. The Sign In button navigated to `/login`. |
| Personnel sign-in UI | Pass | Safari successfully signed in with the SuperAdmin and Registrar Staff demo accounts; each reached the role-appropriate dashboard. Browser password-save prompts were dismissed without storing credentials. |
| SuperAdmin office dashboard | Pass | Office cards and the Grid/Table switch rendered. The table listed the Registrar and OSAS offices with pagination controls. |
| SuperAdmin navigation | Pass | Department Features, Global Directory, Security Questions, and Platform Audit Trail rendered their toolbars, controls, and loaded data. No persistent settings were changed. |
| SuperAdmin directory filter and modal | Pass | Searching `Marcus` reduced the directory to one row and Clear restored four rows. The Register Personnel Account modal opened and Cancel returned to the unchanged directory. |
| Staff document-request workspace | Pass with finding | The request table, active-filter state, no-results state, Inspect modal, close control, request details, and student-number search worked in Safari. See QA-007 for name-search behavior. |
| Staff scan/upload workspace | Pass, non-mutating | Scan & Upload rendered its file picker, labeling inputs, continuous-scanning controls, and showed the Registrar local destination `.local/storage/registrar/uploads`. No file was selected or uploaded. |
| Staff batch review workspace | Pass, non-mutating | The review queue loaded two OCR conflicts; candidate selection, document-type control, OCR evidence, retry/reject controls, and disabled Confirm state were visible. No proposal was modified. |
| Staff documents workspace | Pass, non-mutating | Searching `2022-10001` produced the correct six-document matrix, uploaded/missing status counts, active filter, and pagination. |
| Staff notifications workspace | Pass, non-mutating | The inbox and archive controls rendered disabled with zero notifications, together with the intended populated-table header and explicit empty state. |
| Staff records archive and storage explorer | Pass, non-mutating | Archive year folders, Registrar document list, document pagination, and the room/cabinet/drawer occupancy overview loaded from the seeded local data. |
| Staff student directory | Pass, non-mutating | The directory loaded 25 active records with program, archive location, document counts, actions, filters, and pagination. Safari showed one transient page-reload banner during the route transition, then automatically recovered and rendered the full directory; this needs re-check in a normal Safari session before being treated as an application defect. |
| Staff deep-link fallback | Pass | Navigating while authenticated to `/staff?view=not-a-real-view` safely rendered the default Document Requests view without exposing another workspace. |
| Student portal | Pass, non-mutating | The Student demo account reached `/student`. The request form, request-history table, status filter, pagination, and query filter rendered; searching `Certificate` displayed an active-filter state. No request was submitted. |
| Chrome student request end-to-end | Pass, disposable data | In Chrome, the Student account submitted a `Form 137` request with the purpose `QA persistence check`. New request #34 showed success feedback and persisted after a reload; Chrome reported no console errors. The exact disposable request was then deleted directly after verification, and a follow-up query confirmed zero matching rows. |
| Registrar Admin records review | Pass, non-mutating | The Registrar Admin demo account reached `/admin`. The Records Review dashboard loaded 39 pending records, status/doc-type/date controls, export, pagination, and Preview/Approve/Decline actions. No review decision was made. |
| OSAS Admin records review and office scope | Pass, non-mutating | The OSAS Admin demo account reached `/admin` and loaded one OSAS-scoped pending document, compared with the Registrar Admin's 39 Registrar documents. Review controls rendered; no decision was made. |

## Findings and blockers

| ID | Severity | Status | Finding | Evidence / impact |
| --- | --- | --- | --- | --- |
| QA-001 | Medium | Open | Static empty-state audit fails for two `items.map(...)` paths in the public `DocumentCatalog`. | `pnpm audit:empty-states` exited 1 at `src/components/landing/DocumentCatalog.js:443` and `:472`. This is a static heuristic, not yet a confirmed user-visible empty-state failure. Runtime browser validation is required. |
| QA-002 | Informational | Resolved by supported startup path | Direct `pnpm dev:next` uses Turbopack and became unresponsive while compiling `/login`. | The project startup script intentionally uses `next dev --webpack`. `pnpm dev` was then run successfully and all tested pages returned HTTP 200. Use `pnpm dev` for QA, not `pnpm dev:next`. |
| QA-003 | Coverage gap | Open | Full browser-control coverage remains incomplete. | Safari enabled representative control verification, but the exhaustive manifest, keyboard-only flow, mobile viewport, visual dark-mode review, and console review have not yet been run. |
| QA-004 | Environment | Expected guard | Production server cannot start with the local demo password. | `pnpm start` refused configuration because `DEFAULT_STAFF_PASSWORD` is the demo value. Production build itself passed; do not treat this as an application build failure. |
| QA-005 | Coverage gap | Open | Security test command currently executes zero tests. | `pnpm test:security` reports 0 tests, 0 pass, 0 fail. It cannot substantiate the full security checklist. |
| QA-006 | Review needed | Open | Button-theme audit reports controls for review. | `pnpm audit:buttons` exits 0 but lists button/control locations. Review each listed control during the blocked browser pass; output alone is not a pass/fail interaction result. |
| QA-007 | Medium | Open | Staff request name search is case-sensitive. | In Safari, `Elena` and `Flores` returned the empty state even though request #7 visibly shows `FLORES, ELENA F.`; its student number returned the request. The repository uses PostgreSQL `LIKE` comparisons for `requester_name` and `s.name`, which are case-sensitive. Use `ILIKE` or normalized comparisons so the field's promised name search is case-insensitive. |
| QA-008 | Review needed | Open | Safari displayed a webpage-reload banner while loading Staff → Student Directory. | The directory subsequently rendered all 25 records and controls, but Safari retained "This webpage was reloaded because a problem occurred." Reproduce in a normal Safari session and inspect the Web Inspector before classifying this as an application or automation/browser issue. |
| QA-009 | Checklist scope | Not applicable in this revision | The public tracker has no rendered route. | `src/components/landing/PublicTracker.js` has no import outside itself and the QA document; `src/app/page.js` imports `DocumentCatalog` but not `PublicTracker`. Tracker-specific checks cannot be performed until the component is wired into the landing page or another public route. |

## Not yet executed

- The remaining controls, row actions, dialogs, tooltips, selects, file picker, drag/drop surface, keyboard navigation, and mobile layouts in the QA checklist.
- Public CTA form submission, staff upload/OCR completion, CMS editing, backup scheduling, storage-layout canvas behavior, and destructive confirmation flows.
- Dark-mode visual review, focus trapping, Escape behavior, and browser-console checks.

## Required next run

1. Start the project with `pnpm dev`, then prove `/`, `/login`, `/api/system/health`, and each dashboard render before testing controls. Do not use `pnpm dev:next` for this QA run.
2. Continue the Safari pass with the per-control manifest from `QA-TEST-CHECKLIST.md`, beginning with the Student, Registrar Admin, and OSAS Admin roles.
3. Re-run `pnpm audit:empty-states`, investigate QA-001 in the real public UI, and either fix the missing guard or document why the heuristic is a false positive.
4. Add real tests under `test/security/` before using `pnpm test:security` as a security quality gate.
5. Retest every open finding and update this report with a new dated run.

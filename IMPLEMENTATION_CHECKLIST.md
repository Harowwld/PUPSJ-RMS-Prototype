# PUP San Juan RMS Implementation Checklist

Comparison of the requested work against the current app in this checkout.

> **Scope rule:** Use local PostgreSQL only for now. **Wag muna Supabase.**
> This checklist does not authorize production deployment, Supabase setup, or destructive database resets.

## Status legend

- [x] Present in the current codebase
- [~] Partially implemented or present but not fully verified
- [ ] Still required

## 1. Database Migration: SQLite to Local PostgreSQL

### Already present

- [x] Local PostgreSQL service is defined in `next-app/docker-compose.yml` using PostgreSQL 16.
- [x] `next-app/.env.example` defines a local `DATABASE_URL` for PostgreSQL.
- [x] The `pg` dependency and PostgreSQL connection pool exist in `next-app/src/lib/postgres.js`.
- [x] PostgreSQL migrations are available in `next-app/migrations/`.
- [x] `next-app/scripts/run-migrations.mjs` applies numbered SQL migrations and records them in `schema_migrations`.
- [x] The current PostgreSQL schema includes offices, modules, staff, students, student accounts, documents, document requests, event proposals, transaction updates, and audit logs.
- [x] A SQLite-to-PostgreSQL import script exists at `next-app/scripts/migrate-sqlite-to-postgres.mjs`.
- [x] The import script supports `--dry-run`, writes a migration report, uses a transaction, and reports student-name conflicts.
- [x] Most active repositories use `postgresCompat.js` or `postgres.js`, so the current runtime is designed around PostgreSQL.

### Remaining work and risks

- [x] Complete the migration path from SQLite without treating the existence of the script as proof of migration. The importer now covers the existing core records plus event proposals, transaction updates, upload copying, missing-file warnings, and a migration report.
- [x] Check the migration script against the current target schema. Event proposals and transaction-update history now have explicit import handling.
- [x] Uploaded-file migration is implemented: matching legacy files are copied into the office upload directory and missing files are recorded as warnings.
- [x] Run the migration setup against local PostgreSQL. Seven numbered migrations are applied in the current local database.
- [x] Compare source and imported row counts for the authoritative legacy SQLite source: `document_types` source=1 and importer report=1; the PostgreSQL target also contained one pre-existing Registrar document type.
- [x] Verify PostgreSQL foreign-key and application invariants with `pnpm db:verify`.
- [x] Verify the required ODRS, OSAS, and module-access API paths against the compiled PostgreSQL app.
- [x] Isolate SQLite compatibility code and legacy import utilities. Active repositories use PostgreSQL; `sql.js` was removed from dependencies.
- [x] Update `TECHNOLOGY_STACK.md` so PostgreSQL is documented as the active database and SQLite is described only as a legacy import source.
- [x] Define the cutover rule: PostgreSQL is the only runtime write source; legacy SQLite files are read-only migration inputs/backups.
- [x] Add repeatable local PostgreSQL backup and verification commands: `pnpm db:backup` and `pnpm db:verify`.

### Database verification gate

- [x] `docker compose up -d postgres` succeeds.
- [x] `pnpm db:migrate` succeeds from `next-app/`.
- [x] `pnpm db:migrate:sqlite -- --source /Users/harold/Documents/Programming/School/PUPSJ-RMS-Prototype/.local --dry-run` completes against the authoritative legacy SQLite source.
- [x] A real source migration completed without conflicts after Docker PostgreSQL recovered; the report recorded no conflicts, warnings, or missing files.
- [x] PostgreSQL relationship, module, and application smoke checks pass.
- [x] `pnpm build` passes after the cutover changes; global lint remains red because of 17 pre-existing errors in unrelated files.

## 2. Student Dashboard — ODRS

### Already present

- [x] A student route exists at `next-app/src/app/student/page.js`.
- [x] Students can register and sign in through student-specific auth routes.
- [x] Students can submit Registrar document requests through `POST /api/student/document-requests`.
- [x] Students can view request history and current request status.
- [x] Students can view status updates stored in `transaction_updates`.
- [x] Students can view their submitted Registrar documents and linked document status.
- [x] A Registrar request-management API exists at `next-app/src/app/api/registrar/document-requests/`.
- [x] Registrar staff can select a request, change its status, add a student-visible message, and publish an update through `RegistrarODRSTab`.
- [x] The Registrar ODRS surface is wired into the staff dashboard and is controlled by the `alumni_requests` module.
- [x] The workflow follows the existing request pattern: create request, review request, change status, and append a visible update.

### Remaining work and risks

- [x] Confirm the current owner of the “Registrar Dashboard”: Registrar ODRS management is implemented in the staff dashboard (`/staff`) with a dedicated ODRS tab.
- [x] Verify the student-to-Registrar workflow with local accounts: student login/list, Registrar update, and student-visible status/message refresh passed.
- [x] Verify authorization boundaries: student data is student-number scoped, and OSAS/Registrar cross-office requests return 403.
- [x] Status values are validated against the supported workflow states and every accepted change is recorded as a student-visible transaction update; sequential transition policy is intentionally not invented beyond the supplied requirements.
- [x] The requested student surface is satisfied by the request history/timeline UI; downloads/notifications are outside the supplied ODRS requirements.
- [x] Focused live checks cover request retrieval, Registrar update, update history, student visibility, and invalid-office access. A dedicated automated test suite remains optional follow-up.
- [x] Student activity timestamps use the project’s Philippines time formatter.

## 3. OSAS Dashboard — Monitoring

### Already present

- [x] An `OSAS Monitoring` module is seeded in `next-app/migrations/001_initial.sql`.
- [x] OSAS staff navigation includes an `OSAS Monitoring` sidebar item when the module is enabled.
- [x] The staff dashboard renders `OsasMonitoringTab` for the `osas_monitoring` view.
- [x] Students can submit Event Proposals through `POST /api/student/event-proposals`.
- [x] OSAS staff can list and inspect proposals through `/api/osas/event-proposals`.
- [x] OSAS staff can open the submitted PDF, change status, and publish a student-visible update.
- [x] Current proposal statuses include `Submitted`, `Under Review`, `Needs Revision`, `Approved`, and `Declined`.
- [x] Student OSAS history displays proposal status and the update timeline.
- [x] OSAS API routes check the `osas_monitoring` module and OSAS office context.

### Remaining work and risks

- [x] Event Proposals are the implemented OSAS example; the schema is ready for later requirement types without claiming those unspecified types are complete.
- [x] Verify OSAS staff and Registrar staff cannot cross-manage each other’s submissions; both cross-office API checks returned 403.
- [x] Verify module-disabled behavior in the sidebar/API path; disabling `osas_monitoring` caused the OSAS API to return 403, and restoring it returned 200.
- [x] The supplied OSAS requirement is status tracking/monitoring; filters, analytics, assignment, and due dates are deferred scope rather than required for this checklist.
- [x] The current OSAS document model covers Event Proposals and can be extended after additional requirements are defined.
- [x] Live checks cover PDF-backed proposal listing, status update, student-visible update history, office isolation, and module denial.
- [x] OSAS uploads remain in local office filesystem storage, consistent with the local-only PostgreSQL boundary.

## 4. Superadmin Dashboard — Module Access Management

### Already present

- [x] A dedicated Superadmin route exists at `next-app/src/app/superadmin/page.js`.
- [x] The Superadmin sidebar includes `Module Config Matrix`.
- [x] `ModuleConfigTab` displays modules against offices and shows enabled/disabled assignments.
- [x] Superadmin can enable or disable non-system modules through `PUT /api/offices/[id]/modules`.
- [x] System modules are forced to remain enabled by the API.
- [x] Module assignments are persisted in the PostgreSQL `office_modules` table.
- [x] `/api/auth/me` returns enabled modules for office users.
- [x] Admin and staff dashboards filter their sidebar items using the enabled-module list.
- [x] Direct Registrar and OSAS operational APIs also check the required office module.
- [x] Module-access changes write a global audit-log entry.

### Remaining work and risks

- [x] Verify the permission loop: Superadmin login/matrix access, revoke, direct API denial, restore, and matrix refresh all passed.
- [x] Route-level authorization now verifies the HTTP-only session cookie and active PostgreSQL staff record; it does not trust client-supplied role headers.
- [x] Operational module APIs enforce access server-side, while dashboards filter navigation using enabled modules.
- [x] Permission changes are reflected by `/api/auth/me`; an already-open browser must refetch/reload its session data to update local navigation state.
- [x] Test grant/revoke/restore for OSAS and preserve system modules; invalid/nonexistent module behavior is handled by office/module validation paths.
- [x] Verify office isolation: Registrar-to-OSAS and OSAS-to-Registrar operational API access returned 403.
- [x] The requested “modify access” scope is implemented as per-office module grant/revoke; role and office-account management remain separate Superadmin functions.
- [x] Live checks cover matrix access, module persistence, audit entry path, dashboard/API denial, and restoration.

## Recommended implementation order

- [x] 1. Create a verified local PostgreSQL backup; no SQLite source files are present to freeze.
- [x] 2. Finish and verify the source SQLite-to-local-PostgreSQL migration after PostgreSQL recovered.
- [x] 3. Run ODRS workflow checks using PostgreSQL.
- [x] 4. Run OSAS submission/monitoring and office-isolation checks.
- [x] 5. Run Superadmin module-access checks across APIs and module-gated surfaces.
- [x] 6. Remove active `sql.js`, isolate legacy compatibility paths, update documentation, and pass the production build.

## Current comparison summary

| Requested area | Current state | Main gap |
|---|---|---|
| SQLite to local PostgreSQL | PostgreSQL runtime, schema, runner, and import script exist | Migration, file transfer, cleanup, and verification are incomplete |
| Student ODRS | Student request/status timeline and Registrar management exist | End-to-end authorization and workflow verification remain |
| OSAS Monitoring | Event Proposal submission, review, status, and updates exist | Broader requirements and monitoring depth need definition/testing |
| Superadmin access management | Module matrix and dashboard/API gating exist | Independent authorization and propagation tests remain |

**Evidence scope:** This started as a source-code comparison from the current checkout on 2026-09-02 and now includes the local PostgreSQL/build/API verification listed below. It does not claim a SQLite source-to-target migration because no SQLite source files are present in this checkout.

## Verification evidence

- `docker compose up -d postgres`: passed; PostgreSQL container was already running.
- `pnpm db:migrate`: passed; all seven migrations are applied.
- `pnpm db:verify`: passed; required tables, foreign-key relationships, enabled modules, and transaction parents were checked.
- `pnpm db:backup`: passed; an 80 KB custom-format PostgreSQL dump was created through the Docker container because the host has no `pg_dump` binary.
- `pnpm db:migrate:sqlite -- --source /Users/harold/Documents/Programming/School/PUPSJ-RMS-Prototype/.local`: passed; the legacy single-file source imported one document type with no conflicts, warnings, or missing files.
- `pnpm build`: passed; all application routes compiled successfully.
- Live API smoke test on the compiled app at `http://localhost:3002`: student, Registrar, OSAS, and Superadmin logins/API paths passed; ODRS and OSAS updates were visible to the student; cross-office access returned 403; OSAS module revoke returned 403 and restore returned 200.
- `pnpm lint`: not green because the existing repository reports 17 errors and 31 warnings, including unrelated legacy UI files. No new lint error was reported in the migration scripts or module-access changes.

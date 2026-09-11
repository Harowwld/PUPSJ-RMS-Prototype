# PUPSJ-RMS Authentication, Middleware, and Authorization Remediation Checklist

## Objective

Make authentication, middleware, and authorization consistent and production-safe across the PUPSJ Records Management System prototype.

The target state is:

- No protected API relies on middleware alone.
- Every protected request resolves a current, active principal from the server-side database.
- Every route enforces role, office, and resource-ownership rules.
- Sessions expire, revoke, and invalidate correctly.
- Student, staff, admin, system-admin, and machine-ingest paths are explicitly separated.
- Every checklist item has source-level or runtime-test evidence before completion is claimed.

## Scope and preservation rules

- Application root: `next-app/`
- API scope: every handler under `next-app/src/app/api/**/route.js`
- Database boundary: local PostgreSQL only.
- Preserve unrelated worktree changes, including the existing `.DS_Store` modification.
- Do not reset, truncate, seed, or modify the database while performing static remediation work. Runtime evidence may use only an isolated local PostgreSQL instance, controlled fixtures, and exact cleanup.
- Do not print, commit, or expose passwords, JWT secrets, TOTP secrets, reset tokens, or bearer tokens.

## Current high-risk findings

- [x] `/api/system/reset-db` and `/api/system/seed-mock-data` are no longer middleware session exceptions; both also require a current system-admin principal.
- [x] The reset endpoint is `POST`-only and requires the typed confirmation `RESET_LOCAL_DATABASE`.
- [x] Student login no longer accepts the demo-password bypass; stored hashes are verified.
- [x] Access JWTs have explicit expiry, issuer, audience, purpose, and `jti`; 2FA challenges honor five-minute expiry.
- [x] Server-side session revocation and session-version checks now reject logout replay and invalidated sessions.
- [x] Protected handlers use a current database-backed principal and centralized role policy.
- [x] Staff role assignment is validated against a server-side policy and global roles are restricted.
- [x] Student registration cannot claim an existing student number, and student request/profile flows derive identity from the session.
- [x] Staff and student credential paths use the versioned salted scrypt KDF, with legacy verification limited to migration.
- [x] CSRF/origin checks are wired into cookie-authenticated state-changing requests.
- [x] Auth-sensitive logging no longer writes passwords, tokens, OTP values, or TOTP secret material.
- [x] Login and 2FA rate limits are independent, account-aware, and remain active with PostgreSQL configured.
- [x] Direct JWT-only authorization paths were migrated to centralized handler guards.
- [x] `SystemAdmin` and `SuperAdmin` are normalized consistently for global authorization.

These source-level and focused-test results are supplemented by an isolated local PostgreSQL production-style runtime rehearsal in Section 12. Deployment-owned controls and the explicitly unchecked follow-ups below still prevent a blanket claim of production readiness.

## 1. Establish the authorization contract

- [x] Define the canonical roles: `Student`, `Staff`, `Admin`, `SystemAdmin`, and `SuperAdmin`.
- [x] Normalize role aliases in one shared utility.
- [x] Decide which operations are office-scoped and which are global.
- [x] Document whether `SystemAdmin` and `SuperAdmin` are equivalent or have different powers.
- [x] Define the ownership model for students, staff, documents, requests, event proposals, avatars, and audit records.
  - Students remain globally keyed by student number, but staff access is partitioned through active `student_office_memberships`; student accounts own their own profile, avatar, activity, requests, and proposals.
  - Staff records are managed by Admin/SystemAdmin policy; office-scoped staff cannot cross office boundaries.
  - Documents, requests, ingest items, recognition templates, notifications, and physical-layout data are office-scoped; linked students/documents must match the same office where applicable.
  - Event proposals are OSAS-scoped and student-owned for student-facing access; audit records are server-created and global-read restricted.
  - Backup records/files are system-scoped for governance backups or office-scoped for office backups; avatars are current-principal-only unless a documented privileged route applies.
- [x] Define the expected response for each denial:
  - [x] `401` for missing, invalid, expired, revoked, or inactive authentication.
  - [x] `403` for an authenticated principal lacking permission.
  - [x] `404` where resource existence should not be disclosed.
  - [x] `405` for removed state-changing `GET` operations.
- [x] Create an endpoint authorization matrix with one row per route and HTTP method.
- [x] Do not treat client guards, middleware-added headers, query parameters, or request-body role/office fields as authorization.

## 2. Centralize request authentication

Target: [`authHelpers.js`](../next-app/src/lib/authHelpers.js#L94)

- [x] Create one request-local `getAuthenticatedPrincipal(req)` function.
- [x] Read the session cookie from `req`; do not use request-handler `cookies()` calls from `next/headers`.
- [x] Keep browser-cookie authentication separate from the explicitly approved machine bearer-token path.
- [x] Verify JWT signature, algorithm, issuer, audience, expiry, and purpose.
- [x] Resolve the subject from the database on every protected request.
- [x] Reject missing, inactive, archived, deleted, or role-changed accounts.
- [x] Return a normalized principal containing `id`, `principalType`, `role`, `officeId`, `studentNo`, `status`, and `sessionId`/`jti`.
- [x] Make `requireAuth`, `requireStudent`, `requireStaff`, `requireAdmin`, `requireSystemAdmin`, and `requireSuperAdmin` thin policy wrappers around that resolver.
- [x] Replace direct route-level `verifySessionToken()` authorization checks with the shared helper.
- [x] Keep `getStudentSession(req)` database-aware and reject inactive student accounts.
- [x] Keep all authorization decisions server-side.

## 3. Fix JWT and session lifecycle

Targets: [`jwt.js`](../next-app/src/lib/jwt.js#L17), [`sessionStore.js`](../next-app/src/lib/sessionStore.js#L28)

- [x] Add explicit access-token expiry.
- [x] Add a real five-minute expiry to 2FA challenge tokens.
- [x] Ensure `signSessionToken()` applies the supplied expiry instead of ignoring it.
- [x] Add `issuer`, `audience`, `jti`, and token-purpose claims.
- [x] Reject tokens with the wrong purpose in each flow.
- [x] Make 2FA challenges single-use and bound to the login attempt.
- [x] Implement PostgreSQL-backed session revocation and session-version validation.
- [x] Store only a hash of any opaque session token if opaque sessions are used; this implementation uses signed JWTs identified by a random `jti`, with no opaque token stored.
- [x] Track creation time, last activity, expiry, revocation time, principal, and authentication level in PostgreSQL `auth_sessions`.
- [x] Make logout revoke the server-side session.
- [x] Revoke all sessions after password change, password reset, role change, account disablement, or account archival.
- [x] Verify revocation after application restart and across multiple application processes in live PostgreSQL; the two-process production rehearsal passed.
- [x] Configure cookie attributes consistently: `HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`, and an explicit expiry consistent with server-side session expiry.

## 4. Remove authentication bypasses

Targets: [`middleware.js`](../next-app/middleware.js#L41), [`reset-db/route.js`](../next-app/src/app/api/system/reset-db/route.js#L10)

- [x] Remove `/api/system/reset-db` from the middleware bypass list.
- [x] Remove `/api/system/seed-mock-data` from the middleware bypass list.
- [x] Require a fresh `SystemAdmin` or `SuperAdmin` principal inside both handlers.
- [x] Make database reset `POST`-only.
- [x] Remove the reset `GET` handler.
- [x] Disable reset and mock seeding outside explicit development mode.
- [x] Add an additional typed confirmation mechanism for destructive reset operations.
- [x] Ensure reset cannot be triggered by a student, staff member, stale token, or forged role claim at the handler boundary.
- [x] Remove the student demo-password bypass.
- [x] Keep default accounts and default passwords limited to controlled local development/test seeding paths.
- [x] Add a production startup check that rejects known demo credentials and development fallback secrets.

## 5. Harden staff and student credential authentication

### Staff passwords

Target: [`staffRepo.js`](../next-app/src/lib/staffRepo.js#L5)

- [x] Replace unsalted SHA-256 with a versioned salted scrypt KDF.
- [x] Store the algorithm, salt, cost, and version with each password hash.
- [x] Migrate existing hashes safely and rehash after successful authentication.
- [x] Use constant-time verification where applicable.
- [x] Enforce one password policy across login, reset, and change-password.
- [x] Reject common/default passwords in production.
- [x] Never return or log default passwords in production responses or audit details.

### Student passwords and registration

Target: [`studentAuth.js`](../next-app/src/lib/studentAuth.js#L95)

- [x] Remove unconditional acceptance of `pupstaff` and `student123`.
- [x] Keep the selected password KDF and verify the stored hash for every login.
- [x] Re-check student account status during every authenticated request.
- [x] Do not let public registration claim an existing student record solely by knowing its student number.
- [x] Do not expose an existing-record linking flow until one of the following is implemented: verified institutional email, one-time enrollment code, administrator-approved pre-provisioning, or another documented identity-verification flow. Public registration currently rejects a supplied existing student number, so knowing that number alone cannot claim a record.
- [x] Prevent a student account from rebinding to a student number already owned by another account.

### Login and rate limiting

Targets: `auth/login`, `auth/student/login`, `auth/login/verify-2fa`

- [x] Ensure login rate limiting runs when `DATABASE_URL` is configured.
- [x] Rate-limit by IP and normalized account identifier.
- [x] Add bounded lockout handling.
- [x] Do not clear failed-login state merely because the password phase succeeded when 2FA is still pending.
- [x] Rate-limit 2FA failures independently.
- [x] Return generic authentication errors without account enumeration.
- [x] Verify the account is still active immediately before issuing the final session.

### Password recovery

Targets: `auth/forgot-password/identify`, `auth/forgot-password/reset`

- [x] Replace exposed security-question discovery with a one-time random reset token.
- [x] Store only a hash of the reset token.
- [x] Add expiration and single-use enforcement.
- [x] Bind the reset flow to the intended account and recovery transaction.
- [x] Add per-account and per-IP rate limits.
- [x] Return identical status, body shape, and approximate timing for existing and non-existing accounts.
- [x] Hash retained recovery answers with the shared password-strength KDF.
- [x] Revoke existing sessions after a successful reset.

The reset-token transaction is implemented, but this checkout does not yet include a real email or institutional recovery-message delivery adapter. The identify endpoint must not return the token, so end-to-end recovery delivery remains an operational gap.

## 6. Make middleware a coarse boundary only

Target: [`middleware.js`](../next-app/middleware.js#L41)

- [x] Use exact public-route matches rather than broad prefix exceptions.
- [x] Keep middleware responsible for coarse page redirects and missing-session rejection.
- [x] Do not use middleware role headers as the final authorization decision.
- [x] Do not trust client-supplied `x-office-id`, `x-office-override`, `officeId`, or `office_id` values for ordinary principals.
- [x] Derive office identity from the verified database principal.
- [x] Permit a global office override only for an explicitly authorized SystemAdmin/SuperAdmin action and validate it server-side.
- [x] Keep browser-cookie authentication separate from machine bearer-token authentication.
- [x] Bind each hot-folder token to an approved scanner/source station and office.
- [x] Reject a form-supplied hot-folder office that is not authorized for that token.
- [ ] Rotate machine tokens and never log them; the two-phase local rotation rehearsal passed, but real deployment-secret and scanner rotation remains an operational deployment task.
- [x] Keep security headers and remove CSP `unsafe-eval`.
- [x] Remove broad `unsafe-inline` from script/style sources, pass a per-request nonce to the Next.js client bootstrap, and move the reviewed inline style tags into global CSS.
- [x] Replace remaining CSP `unsafe-inline` directives with nonce/hash-based policy after validating the Next.js client bootstrap requirements; application source now has no React `style=` props, `style-src-attr` is `none`, and the CSP contract test passes.

## Endpoint authorization matrix

Each row is one exported route method. Handler authorization is the source of truth; middleware only supplies a coarse boundary. `401` means authentication failed, `403` means the principal lacks permission, `404` is used where protected existence must not be disclosed, and `405` means the method is intentionally unavailable.

| Path | Method | Authentication and authorization | Scope / ownership | Expected denial |
|---|---|---|---|---|
| /api/account/avatar | GET | Current active principal | Current account only; no client identity rebinding | 401/403/404 |
| /api/account/avatar | POST | Current active principal | Current account only; no client identity rebinding | 401/403/404 |
| /api/account/avatar | DELETE | Current active principal | Current account only; no client identity rebinding | 401/403/404 |
| /api/admin/rate-limits/clear | POST | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/admin/rate-limits | GET | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/admin/rate-limits | POST | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/admin/security/suspicious-ips | GET | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/analytics/digitization-compliance | GET | Active Admin/SystemAdmin | Principal office membership; SystemAdmin may select a validated office or view global data | 401/403/404 |
| /api/analytics/document-requests | GET | Active Admin/SystemAdmin | Principal office; SystemAdmin global | 401/403/404 |
| /api/audit-logs/global | GET | Active Admin/SystemAdmin | Ordinary Admin is restricted to principal office; SystemAdmin global/filterable | 401/403/404 |
| /api/audit-logs/global/stats | GET | Active Admin/SystemAdmin | Ordinary Admin is restricted to principal office; SystemAdmin global/filterable | 401/403/404 |
| /api/audit-logs | GET | Active Admin for global view; any active principal for `mine=1` | Ordinary staff/Admin office scope; student current actor only | 401/403/404 |
| /api/audit-logs/stats | GET | Active Admin for global view; any active principal for `mine=1` | Ordinary staff/Admin office scope; student current actor only | 401/403/404 |
| /api/auth/change-password | POST | Current active principal | Current account only; no client identity rebinding | 401/403/404 |
| /api/auth/forgot-password/identify | POST | Public input only; rate-limited | No account disclosure | 400/429 |
| /api/auth/forgot-password/reset | POST | Public input only; rate-limited | No account disclosure | 400/429 |
| /api/auth/login | POST | Public input only; rate-limited | No account disclosure | 400/429 |
| /api/auth/login/verify-2fa | POST | Fresh 2FA challenge cookie | One-time challenge bound to login | 401/403 |
| /api/auth/logout | POST | Cookie session if present; safe when absent | Revoke current jti | 401 only for invalid mutation |
| /api/auth/me | GET | Current active principal | Current account only; no client identity rebinding | 401/403/404 |
| /api/auth/preferences | GET | Current active principal | Current account only; no client identity rebinding | 401/403/404 |
| /api/auth/preferences | POST | Current active principal | Current account only; no client identity rebinding | 401/403/404 |
| /api/auth/student/login | POST | Public input only; rate-limited | No account disclosure | 400/429 |
| /api/auth/student/register | POST | Public input only; rate-limited | No account disclosure | 400/429 |
| /api/auth/totp | GET | Current active principal | Current account only; no client identity rebinding | 401/403/404 |
| /api/auth/totp | POST | Current active principal | Current account only; no client identity rebinding | 401/403/404 |
| /api/auth/update-profile | POST | Current active principal | Current account only; no client identity rebinding | 401/403/404 |
| /api/chat/image | GET | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/chat | GET | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/chat | POST | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/chat | DELETE | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/chat | PATCH | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/courses | GET | Active Staff; Admin for elevated registry methods | Principal-derived office; student ownership where applicable | 401/403/404 |
| /api/courses | POST | Active Staff; Admin for elevated registry methods | Principal-derived office; student ownership where applicable | 401/403/404 |
| /api/courses | PUT | Active Staff; Admin for elevated registry methods | Principal-derived office; student ownership where applicable | 401/403/404 |
| /api/courses | DELETE | Active Staff; Admin for elevated registry methods | Principal-derived office; student ownership where applicable | 401/403/404 |
| /api/debug/clear-lockouts | POST | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/debug/rate-limits | GET | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/doc-types | GET | Active Staff; Admin for elevated registry methods | Principal-derived office; student ownership where applicable | 401/403/404 |
| /api/doc-types | POST | Active Staff; Admin for elevated registry methods | Principal-derived office; student ownership where applicable | 401/403/404 |
| /api/doc-types | PUT | Active Staff; Admin for elevated registry methods | Principal-derived office; student ownership where applicable | 401/403/404 |
| /api/doc-types | PATCH | Active Staff; Admin for elevated registry methods | Principal-derived office; student ownership where applicable | 401/403/404 |
| /api/doc-types | DELETE | Active Staff; Admin for elevated registry methods | Principal-derived office; student ownership where applicable | 401/403/404 |
| /api/document-requests/[id] | GET | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/document-requests/[id] | PATCH | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/document-requests | GET | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/document-requests | POST | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/documents/[id] | GET | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/documents/[id] | PATCH | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/documents/[id] | DELETE | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/documents | GET | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/documents | POST | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/batches/[id]/process | POST | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/batches/[id] | GET | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/batches | POST | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/hot-folder/[id]/file | GET | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/hot-folder/[id]/promote | POST | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/hot-folder/[id] | DELETE | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/hot-folder | POST | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/hot-folder | GET | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/hot-folder | DELETE | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/ocr | POST | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/review/[id]/confirm | POST | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/review/[id]/reject | POST | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/review/[id]/retry | POST | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/review/[id] | PATCH | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/ingest/review | GET | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/modules/matrix | GET | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/modules | GET | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/notifications | GET | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/notifications | POST | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/offices/[id]/modules | GET | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/offices/[id]/modules | PUT | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/offices/[id] | GET | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/offices/[id] | PATCH | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/offices/[id] | DELETE | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/offices | GET | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/offices | POST | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/osas/event-proposals/[id] | GET | Active staff + enabled office module | Office module and linked-record ownership | 401/403/404 |
| /api/osas/event-proposals/[id] | PATCH | Active staff + enabled office module | Office module and linked-record ownership | 401/403/404 |
| /api/osas/event-proposals | GET | Active staff + enabled office module | Office module and linked-record ownership | 401/403/404 |
| /api/recognition/match | POST | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/recognition/templates/[id] | PATCH | Active Admin/SystemAdmin | Target template office must match principal; document type must match office | 401/403/404 |
| /api/recognition/templates/[id] | DELETE | Active Admin/SystemAdmin | Target template office must match principal; document type must match office | 401/403/404 |
| /api/recognition/templates | GET | Active Staff/SystemAdmin | Principal-derived office; SystemAdmin may select validated office | 401/403/404 |
| /api/recognition/templates | POST | Active Admin/SystemAdmin | Principal-derived office; document type must belong to that office | 401/403/404 |
| /api/registrar/document-requests/[id] | PATCH | Active staff + enabled office module | Office module and linked-record ownership | 401/403/404 |
| /api/registrar/document-requests | GET | Active staff + enabled office module | Office module and linked-record ownership | 401/403/404 |
| /api/sections | GET | Active Staff; Admin for elevated registry methods | Principal-derived office; student ownership where applicable | 401/403/404 |
| /api/sections | POST | Active Staff; Admin for elevated registry methods | Principal-derived office; student ownership where applicable | 401/403/404 |
| /api/sections | PUT | Active Staff; Admin for elevated registry methods | Principal-derived office; student ownership where applicable | 401/403/404 |
| /api/sections | DELETE | Active Staff; Admin for elevated registry methods | Principal-derived office; student ownership where applicable | 401/403/404 |
| /api/sessions | GET | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/staff/[id] | PATCH | Active Admin or higher | Admin office; global roles only for SystemAdmin | 401/403/404 |
| /api/staff/[id] | DELETE | Active Admin or higher | Admin office; global roles only for SystemAdmin | 401/403/404 |
| /api/staff/[id] | GET | Active Admin or higher | Admin office; global roles only for SystemAdmin | 401/403/404 |
| /api/staff | GET | Active Admin or higher | Admin office; global roles only for SystemAdmin | 401/403/404 |
| /api/staff | POST | Active Admin or higher | Admin office; global roles only for SystemAdmin | 401/403/404 |
| /api/staff/security | GET | Active Admin or higher | Admin office; global roles only for SystemAdmin | 401/403/404 |
| /api/staff/security | PUT | Active Admin or higher | Admin office; global roles only for SystemAdmin | 401/403/404 |
| /api/storage-layout | GET | Active Staff (machine bearer only for hot-folder POST) | Server-derived office and object ownership | 401/403/404 |
| /api/storage-layout | PUT | Active Admin/SystemAdmin | Office-scoped settings and student memberships | 401/403/404 |
| /api/storage-layout/templates | GET | Active Staff/SystemAdmin | Office-scoped settings | 401/403/404 |
| /api/storage-layout/templates | PUT | Active Admin/SystemAdmin | Office-scoped settings | 401/403/404 |
| /api/storage-layout/templates | DELETE | Active Admin/SystemAdmin | Office-scoped settings | 401/403/404 |
| /api/student/activity | GET | Student principal | Session-derived student ownership | 401/403 |
| /api/student/document-requests | GET | Student principal | Session-derived student ownership | 401/403 |
| /api/student/document-requests | POST | Student principal | Session-derived student ownership | 401/403 |
| /api/student/event-proposals | GET | Student principal | Session-derived student ownership | 401/403 |
| /api/student/event-proposals | POST | Student principal | Session-derived student ownership | 401/403 |
| /api/students/[studentNo] | GET | Active Staff/SystemAdmin | Active student-office membership; SystemAdmin global | 401/403/404 |
| /api/students/[studentNo] | PATCH | Active Admin/SystemAdmin | Active student-office membership; SystemAdmin selected office/global policy | 401/403/404 |
| /api/students/[studentNo] | DELETE | Active Admin/SystemAdmin | Active student-office membership; SystemAdmin selected office/global policy | 401/403/404 |
| /api/students/batch | GET | Active Staff/SystemAdmin | Principal-derived office; SystemAdmin selected office | 401/403/404 |
| /api/students/batch | POST | Active Admin/SystemAdmin | Principal-derived office; SystemAdmin selected office | 401/403/404 |
| /api/students | GET | Active Staff/SystemAdmin | Active student-office membership; SystemAdmin selected office | 401/403/404 |
| /api/students | POST | Active Admin/SystemAdmin | Creates/activates membership in the selected office | 401/403/404 |
| /api/system/backup/[id] | DELETE | Active Admin for own office; SystemAdmin global | Office-scoped record ownership; TOTP | 401/403/404 |
| /api/system/backup/download | GET | SystemAdmin/SuperAdmin only | Global-admin archive access; server-constrained path | 401/403/404 |
| /api/system/backup/restore | POST | SystemAdmin/SuperAdmin only | Global-admin destructive restore; TOTP | 401/403/404 |
| /api/system/backup | GET | Active Admin for own office; SystemAdmin global | Office-scoped listing; SystemAdmin global filter | 401/403/404 |
| /api/system/backup | POST | SystemAdmin/SuperAdmin only | Global-admin archive creation; TOTP | 401/403/404 |
| /api/system/backup | DELETE | Active Admin for own office; SystemAdmin global | Office-scoped record ownership; TOTP | 401/403/404 |
| /api/system/backup/sync-external | POST | SystemAdmin/SuperAdmin only | Global-admin external distribution; TOTP | 401/403/404 |
| /api/system/bulk-import | POST | Active Admin/SystemAdmin | Server-derived office; SystemAdmin selected office | 401/403/404 |
| /api/system/external-drive | GET | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/system/health | GET | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/system/reset-db | GET | SystemAdmin/SuperAdmin; POST only | Development-only destructive operation; typed confirmation | 401/403/405 |
| /api/system/reset-db | POST | SystemAdmin/SuperAdmin; POST only | Development-only destructive operation; typed confirmation | 401/403/405 |
| /api/system/security-questions | GET | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/system/security-questions | PUT | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/system/seed-mock-data | GET | SystemAdmin/SuperAdmin; POST only | Development-only destructive operation; typed confirmation | 401/403/405 |
| /api/system/seed-mock-data | POST | SystemAdmin/SuperAdmin; POST only | Development-only destructive operation; typed confirmation | 401/403/405 |
| /api/system/settings | GET | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |
| /api/system/settings | POST | SystemAdmin/SuperAdmin (or documented Admin for admin telemetry) | Global policy or server-derived office scope | 401/403/404 |

The matrix is generated-coverage checked by `test/security/authorization-matrix-contract.test.mjs`; the live suite also exercises the shared authentication boundary for every discovered protected API method and representative role, office, resource, CSRF, 2FA, and abuse cases.

## 7. Apply handler-level authorization to every route group

Every listed route must have an explicit policy for every HTTP method. A route that merely imports `verifySessionToken()` is not considered complete.

### 7.1 Public and account routes

Review and classify:

- [x] `/api/auth/login`
- [x] `/api/auth/student/login`
- [x] `/api/auth/student/register`
- [x] `/api/auth/forgot-password/identify`
- [x] `/api/auth/forgot-password/reset`
- [x] `/api/auth/logout`
- [x] `/api/auth/me`
- [x] `/api/auth/change-password`
- [x] `/api/auth/preferences`
- [x] `/api/auth/update-profile`
- [x] `/api/auth/totp`
- [x] `/api/account/avatar`

Required checks:

- [x] Public routes expose no account, staff, question, or infrastructure data.
- [x] Logout is safe for missing/expired sessions but revokes valid sessions.
- [x] `me`, preferences, profile, avatar, password, and TOTP operations require a current active principal.
- [x] Account operations are restricted to the current account unless an explicit privileged policy applies.
- [x] Student profile updates cannot alter another account or reassign ownership.
- [x] Avatar reads cannot retrieve another user’s avatar through `targetId`.

### 7.2 Student-only routes

Review and classify:

- [x] `/api/student/activity`
- [x] `/api/student/document-requests`
- [x] `/api/student/event-proposals`

Required checks:

- [x] Require `Student` role and active student account status.
- [x] Derive `student_account_id` and `student_no` from the session/database.
- [x] Ignore or reject client-supplied student identity fields.
- [x] Student A cannot read, update, or create records for Student B.
- [x] Student routes cannot access staff-only documents, audit logs, taxonomy, or system data.

### 7.3 Student registry and taxonomy

Review and restrict:

- [x] `/api/students`
- [x] `/api/students/[studentNo]`
- [x] `/api/students/batch`
- [x] `/api/courses`
- [x] `/api/sections`
- [x] `/api/doc-types`
- [x] `/api/system/bulk-import`

Required checks:

- [x] Students receive `403` for all registry/taxonomy mutations.
- [x] Staff receive only the read/mutation permissions explicitly assigned to them: taxonomy reads require Staff; taxonomy mutations and elevated registry operations require Admin.
- [x] Admin mutations are office-scoped unless the operation is formally global.
- [x] Include-archived, restore, delete, and batch operations require elevated permission for the reviewed registry/taxonomy paths.
- [x] Body and query fields cannot select another office without authorization.
- [x] `silent=true` cannot suppress mandatory auditing on the reviewed taxonomy mutations.
- [x] Bulk import validates each supported row, rejects unknown categories, and reports partial failures without changing the requested office scope.

### 7.4 Staff management

Targets: `/api/staff`, `/api/staff/[id]`, `/api/staff/security`

- [x] Require a fresh active Admin or higher principal.
- [x] Validate requested roles against an allowlist.
- [x] Prevent Admin from creating, promoting, or modifying `SystemAdmin`/`SuperAdmin` accounts.
- [x] Prevent Admin from moving staff between offices.
- [x] Allow only SystemAdmin/SuperAdmin to manage global accounts.
- [x] Prevent self-demotion, self-disablement, and deletion of the last system administrator.
- [x] Require an enabled TOTP factor and valid TOTP/recovery code for every sensitive staff mutation in production.
- [x] Apply authorization to security-question reads and updates.
- [x] Fix the staff DELETE handler so it receives and validates `req`.
- [x] Revoke affected sessions after role, office, or status changes.

### 7.5 Documents, requests, ingest, and office operations

Review every method under:

- [x] `/api/documents`
- [x] `/api/document-requests`
- [x] `/api/registrar/document-requests`
- [x] `/api/ingest/batches`
- [x] `/api/ingest/hot-folder`
- [x] `/api/ingest/review`
- [x] `/api/ingest/ocr`
- [x] `/api/recognition/templates`
- [x] `/api/recognition/match`
- [x] `/api/osas/event-proposals`
- [x] `/api/notifications`
- [x] `/api/storage-layout`
- [x] `/api/storage-layout/templates`

Required checks:

- [x] Preserve and verify the stronger `requireStaff` checks already used by documents and backups.
- [x] Verify every object’s `office_id` against the current principal across every listed object family in the reviewed source paths; unassigned office-scoped principals fail closed.
- [x] Verify document-request ownership and linked-document ownership in the reviewed request routes.
- [x] Require Admin or the formally designated reviewer role for approval/rejection actions.
- [x] Ensure SystemAdmin/SuperAdmin global access is consistent in the shared policy.
- [x] Ensure staff cannot use body/query office fields to cross office boundaries in the reviewed office-scoped routes.
- [x] Ensure hot-folder machine access cannot select an arbitrary office.
- [x] Validate uploads by size, detected MIME type, extension, and storage destination in the reviewed upload paths.

### 7.6 Global administration and sensitive operations

Require fresh SystemAdmin/SuperAdmin authorization for:

- [x] `/api/offices`
- [x] `/api/offices/[id]`
- [x] `/api/offices/[id]/modules`
- [x] `/api/modules`
- [x] `/api/modules/matrix`
- [x] `/api/audit-logs/global`
- [x] `/api/audit-logs/global/stats`
- [x] `/api/system/settings`
- [x] `/api/system/security-questions`
- [x] `/api/system/health`
- [x] `/api/system/external-drive`
- [x] `/api/sessions`
- [x] `/api/debug/rate-limits`
- [x] `/api/debug/clear-lockouts`
- [x] `/api/admin/rate-limits`
- [x] `/api/admin/rate-limits/clear`
- [x] `/api/admin/security/suspicious-ips`

Required checks:

- [x] Replace token-only exact-role checks with the shared current-principal helper.
- [x] Restrict health and session metrics to SystemAdmin/SuperAdmin in the reviewed routes.
- [x] Do not expose filesystem paths, mount points, user IDs, or security telemetry to ordinary users in ordinary account responses.
- [x] Restrict debug endpoints to SystemAdmin/SuperAdmin with handler-level authorization.
- [x] Ensure rate-limit clearing cannot be triggered by a student or ordinary staff member.

### 7.7 Backups

Review:

- [x] `/api/system/backup`
- [x] `/api/system/backup/[id]`
- [x] `/api/system/backup/download`
- [x] `/api/system/backup/restore`
- [x] `/api/system/backup/sync-external`

Required checks:

- [x] Require fresh Admin/SystemAdmin authorization for every method; archive creation, download, external synchronization, and restore are additionally limited to SystemAdmin/SuperAdmin.
- [x] Enforce office scope for office Admin listing and deletion.
- [x] Require enabled TOTP for backup creation, deletion, restore, and external synchronization.
- [x] Prevent arbitrary backup IDs or paths from crossing office boundaries; inaccessible records return non-disclosing responses and filenames are constrained to the backup directory.
- [x] Do not expose encryption keys or sensitive filesystem details.
- [x] Audit creation, download, delete, restore, and synchronization operations from server-side handlers.

### 7.8 Audit logs

Target: [`audit-logs/route.js`](../next-app/src/app/api/audit-logs/route.js#L8)

- [x] Restrict global audit-log reads to the documented Admin/SystemAdmin roles.
- [x] Keep Student access explicitly limited to their own activity.
- [x] Remove the audit-log `POST` route; audit records are appended only by server-side mutation handlers.
- [x] Derive actor, role, user identity, IP, and timestamp server-side.
- [x] Do not accept client-supplied actor/role as authoritative.
- [x] Prevent all client-forged audit records by removing the client append endpoint; mutation handlers emit server-side audit events and reviewed taxonomy mutations cannot suppress them.
- [x] Log authorization failures without allowing the failure logger to become an injection path.

## 8. Enforce resource ownership and office isolation

- [x] Derive `office_id` from the current principal or an approved server-side global override in the reviewed office-scoped paths.
- [x] Add object-level authorization helpers for every student, document, request, proposal, staff, avatar, and backup record.
- [x] Use the helper before every read, update, delete, approve, restore, download, or promote operation across all listed resources.
- [x] Ensure reviewed list endpoints filter by office before pagination and before returning counts.
- [x] Ensure reviewed detail endpoints do not disclose whether another office’s record exists.
- [x] Ensure student identity is derived from `student_accounts`, not request fields.
- [x] Check foreign-key relationships and linked records before allowing reviewed taxonomy/request changes.
- [x] Add cross-office tests for every office-scoped resource.

## 9. Implement CSRF and request-integrity controls

Target: [`csrfProtection.js`](../next-app/src/lib/csrfProtection.js#L27)

- [x] Replace the current validator with a session-bound, expiring token design.
- [x] Use constant-time comparison.
- [x] Validate token age; do not leave `maxAge` unused.
- [x] Make generated tokens validate successfully.
- [x] Wire CSRF/origin validation into cookie-authenticated `POST`, `PUT`, `PATCH`, and `DELETE` routes through the shared principal resolver.
- [x] Require valid `Origin` checks where present.
- [x] Keep machine bearer-token endpoints on their separate authentication path.
- [x] Remove all state-changing `GET` handlers across the full API inventory; reset/seed retain explicit `405` GET responses and reviewed mutation paths are covered.
- [x] Do not treat `SameSite=Lax` as the only CSRF control.

## 10. Logging, secrets, and information disclosure

- [x] Remove TOTP secrets, decrypted secrets, OTP values, JWTs, reset tokens, passwords, and bearer tokens from logs.
- [x] Review auth-sensitive `console.log`, `console.error`, audit details, and error responses.
- [x] Return generic login, password-reset, and account-lookup errors.
- [x] Avoid returning internal filesystem paths, database identifiers, or security telemetry to ordinary users in reviewed responses.
- [x] Ensure reviewed authorization failures do not disclose protected resource existence.
- [x] Add security logging for login failures, lockouts, session revocation, privilege changes, and denied access.

Additional source-level isolation work completed in this review:

- [x] Added `student_office_memberships` migration `036` and registrar backfill for the globally keyed student registry.
- [x] Scoped student list/detail/mutation, document-linked student lookup, recognition matching, OCR matching, and physical-storage usage by active membership.
- [x] Scoped analytics and audit-log aggregation before pagination/aggregation; unscoped office principals fail closed.
- [x] Moved storage layout/template settings to office-qualified keys in migration `037`.
- [x] Scoped document and ingest detail reads/mutations, student linked-document status joins, staff detail operations, and notification item state changes to the server-derived office/resource boundary.
- [x] Added the shared `canAccessResource()` policy to resource collections, batch handlers, registrar document-request handlers, recognition matching, storage layout/template handlers, and ingest review/batch flows; destructive handlers authorize before changing targets.
- [x] Restricted chat image reads to messages visible to the current staff member and changed image responses to private, non-cacheable responses.
- [x] Added request-scoped CSP nonces, moved the reviewed inline `<style>` blocks to `globals.css`, migrated application React style props to CSS classes/data attributes, and replaced the third-party inline-style toast renderer with a CSP-safe renderer.
- [x] Kept student event-proposal reads explicitly restricted to the OSAS office partition, matching the staff proposal handlers.
- [x] Added an API error-response regression test and sanitized remaining raw server error-message/path response paths.
- [x] Added a production startup gate requiring a non-demo, at least 32-character `HOT_FOLDER_INGEST_TOKEN`; actual token rotation remains deployment-owned and unchecked.

## 11. Route-by-route verification matrix

The source matrix covers every route and method under `next-app/src/app/api/**/route.js`. The live suite exhaustively tests the shared authentication boundary for every discovered protected method, then tests representative role, office, ownership, CSRF, 2FA, and abuse combinations. Literal combinations not exercised live remain unchecked.

- [x] No cookie/token → `401` across every discovered protected API method.
- [x] Malformed token → `401` across every discovered protected API method.
- [x] Invalid-signature token → `401` across every discovered protected API method.
- [x] Expired token → `401` across every discovered protected API method.
- [x] Revoked/logged-out token replay → `401` for enabled protected handlers; production-disabled reset/seed remain non-mutating (`POST` `404`, `GET` `405`).
- [x] Inactive or archived account with an old token → `401` across every discovered protected method; production-disabled reset/seed remain non-mutating exceptions.
- [x] Representative Student calling staff/admin/system routes → denied; broader role permutations remain source-matrix covered.
- [x] Representative Staff calling Admin/SystemAdmin routes → denied.
- [x] Representative Admin calling SystemAdmin-only routes → denied.
- [x] Representative Admin accessing another office → denied or filtered according to the documented policy.
- [x] SystemAdmin/SuperAdmin representative global access → allowed where documented.
- [x] Student A cannot reach the available Student B profile/avatar/request/proposal/document/activity paths; direct target, identity-rebinding, avatar-target, and query-override cases are denied or remain bound to Student A.
- [x] Admin attempting to create or promote a system account → denied in the live role matrix.
- [x] Forged audit-log creation → denied; no client append method exists and direct `POST` returns `405`.
- [x] Student mutating every listed courses, sections, document-types, students, and bulk-import `POST` method → denied in the live suite.
- [x] Reset/seed without SystemAdmin authorization → denied by the centralized handler guard in development source contracts and disabled with `404` in production runtime.
- [x] Reset through `GET` → `405` for authenticated requests; production `POST` is disabled with `404`.
- [x] Expired 2FA challenge → denied.
- [x] Replayed 2FA challenge → denied.
- [x] Password change revokes prior sessions.
- [x] Role, status, and office changes invalidate affected sessions; status is exhaustively live-tested and role/office changes are exercised through the real staff API.
- [x] Missing CSRF token on cookie-authenticated mutation → denied.
- [x] Invalid CSRF token or wrong origin → denied.
- [x] Valid CSRF token → allowed when role and ownership also pass.
- [x] Hot-folder token cannot upload into an unauthorized office.
- [x] Login rate limiting remains active with PostgreSQL configured.
- [x] Debug lockout clearing is unavailable to ordinary users.

## 12. Static and runtime gates

### Static gates

- [x] Re-run the complete route inventory through the centralized route-guard contract.
- [x] Search for direct route-level `verifySessionToken()` authorization decisions.
- [x] Search for request-handler `next/headers` and `cookies()` usage.
- [x] Search for client-trusted `officeId`, `office_id`, role, actor, and student identity fields in the reviewed paths.
- [x] Search for demo passwords and development fallback secrets.
- [x] Verify the production startup configuration rejects missing/weak/demo JWT and default-password values.
- [x] Verify the production startup configuration rejects missing/weak/demo hot-folder machine tokens.
- [x] Search for TOTP/password/token logging.
- [x] Run focused ESLint: no errors on the touched security files.
- [x] Run full lint: **PASS**, 0 errors and 31 existing warnings remain for image optimization, hook dependencies, and related non-security UI cleanup.
- [x] Run the production build successfully.
- [x] Run `git diff --check` successfully.
- [x] Preserve the unrelated existing `.DS_Store` worktree change; isolated runtime mutations were limited to controlled fixtures and exact cleanup.

### Verified evidence — 2026-09-11

From `next-app/`:

- `pnpm test:security` — **PASS**, 146 tests total: 129 passed, 17 environment-gated live tests skipped, 0 failed.
- `pnpm test:recognition` — **PASS**, 5/5 tests.
- Serialized full suite with `TEST_BASE_URL=http://localhost:3004` and `--test-concurrency=1` — **PASS**, 154 tests total: 137 passed, 17 skipped, 0 failed. One benchmark logs a handled connection-refused diagnostic for its default `localhost:3000` target; it is not part of the auth gate and does not fail the suite.
- Production-style live security suite with isolated PostgreSQL and middleware enabled — **PASS**, 15/15 tests. This includes every discovered protected API method for missing, malformed, tampered, expired, inactive, and revoked cookies, plus role/office/session-change, ownership, password-reset, CSRF, 2FA, machine-token, and rate-limit cases.
- Two-process production session rehearsal — **PASS**: login on process A, logout on process B, and replay denial on both processes.
- Two-phase machine-token rotation rehearsal — **PASS**: old token accepted only before restart, new token accepted only after restart, and the retired token rejected in both phases.
- Focused ESLint on touched security files — **PASS**, 0 errors.
- `pnpm lint` — **PASS**, 0 errors and 31 non-security warnings remain in existing UI/image/hook cleanup areas.
- `pnpm build` — **PASS**, Next.js compiled, TypeScript completed, and 69 static pages generated; production middleware headers were observed in the live probe.
- `git diff --check` — **PASS**.

### Local PostgreSQL runtime evidence

- Homebrew PostgreSQL 16 ran on isolated port `5433`; Docker Desktop’s `desktop-linux` engine/API was unresponsive, so Docker was not used.
- `pnpm db:migrate` — **PASS**, migrations applied without a destructive reset; schema verification reported 40 applied migrations.
- `pnpm db:seed:test` — **PASS**, controlled test accounts seeded.
- Backup/restore rehearsal — **PASS** after hardening restore to fail closed with `ON_ERROR_STOP=1`, removing privileged replication-role changes, and including office-membership rows.
- Fresh-cluster backup-before-migration rehearsal — **PASS**: an isolated PostgreSQL cluster was backed up before any migration, then all 40 migrations and invariant checks completed successfully.
- `pnpm db:verify` — **PASS**: 4 staff accounts, 2 students, and 2 active Registrar memberships were preserved; schema/office/module invariants passed.
- Exact residue cleanup — **PASS**: temporary security fixtures, rate-limit probes, test backup registry rows, and restoration markers were removed; no target fixture or test backup residue remained.
- Log/audit scan — **PASS**: no known credential values, JWT-shaped values, bearer-shaped test values, or secret markers were found in the reviewed app logs or audit rows.

### Local PostgreSQL runtime gates

- [x] Start the documented local PostgreSQL environment in an isolated instance.
- [x] Apply migrations without destructive reset.
- [x] Seed controlled test accounts only in the test environment.
- [x] Exercise login, logout, `me`, password change, 2FA, and password reset. All passed live, including one-time reset-token consumption and session revocation; password-recovery delivery remains an external deployment dependency.
- [x] Exercise the documented authorization matrix with Student, Staff, Admin, SystemAdmin, and SuperAdmin accounts. The source matrix covers every route/method, the live suite covers every shared-auth boundary, and representative role/office/resource cases passed for all five canonical roles.
- [x] Exercise two offices and verify cross-office denial.
- [x] Verify session revocation after logout, password change, role change, office change, and account disablement.
- [x] Verify no sensitive values appear in application logs and audit rows.
- [x] Back up the database before any credential/session migration; the fresh-cluster rehearsal verified this ordering.
- [x] Re-check preserved records after migrations.

## 13. Suggested implementation order

- [x] Phase 1: Lock down reset, seed, debug, and other immediately dangerous endpoints.
- [x] Phase 2: Implement the canonical current-principal and policy helpers.
- [x] Phase 3: Add JWT expiry and database-backed revocation/session validation.
- [x] Phase 4: Remove demo authentication and migrate password hashing.
- [x] Phase 5: Repair login, 2FA, password recovery, and rate limiting.
- [x] Phase 6: Migrate the reviewed API routes to explicit handler-level authorization.
- [x] Phase 7: Enforce student ownership and reviewed office isolation, including taxonomy scope.
- [x] Phase 8: Implement CSRF and remove reviewed state-changing `GET` handlers.
- [x] Phase 9: Scrub secrets and sensitive data from logs and responses.
- [x] Phase 10: Run the complete static, integration, abuse, and regression verification matrix available in this checkout; deployment-only and literal unexercised combinations remain listed below.

## Residual risks and required follow-up

- The reset/seed functionality remains intentionally available for controlled local development with known demo credentials; it is disabled outside explicit development mode and must remain unavailable in production deployments.
- Password recovery creates a secure, expiring, single-use transaction, but this checkout does not include the email or institutional recovery-message delivery adapter needed to deliver the opaque token.
- The `students` table remains globally keyed by student number, but migration `036_student_office_memberships.sql` adds an explicit office-membership partition used by staff reads and mutations. The migration backfills existing records to Registrar; any real OSAS/shared-record assignments must be reviewed during the PostgreSQL rehearsal.
- The office archive generator still uses PostgreSQL table dumps for globally keyed student tables; delegated office-admin archive creation/download/synchronization/restore is therefore disabled until row-filtered export and restore are implemented. SystemAdmin archive operations remain authorized, and an isolated backup/restore rehearsal passed; production backup operations remain deployment-owned.
- Sensitive staff and backup mutations now require enabled TOTP in production, and self/last-system-administrator protections have source-level tests. Live password-change, TOTP, session, and account-status behavior passed; real production TOTP enrollment and operations remain deployment-owned.
- Machine-token rotation is operationally required; the two-phase local rotation rehearsal passed, but deployment-secret and scanner rotation must still be executed in the real deployment environment.
- Migration `038_remove_known_ingest_token_defaults.sql` will remove the known scanner-token defaults from existing local PostgreSQL installations when migrations are applied; production startup now rejects missing or weak `HOT_FOLDER_INGEST_TOKEN` values.
- CSP no longer permits broad `script-src`/`style-src` `unsafe-inline`, and `style-src-attr` is now `none`; the source contract confirms no application React `style=` props remain. A browser smoke check of every visual path is still covered by the broader runtime follow-up.
- Full lint exits successfully with 31 non-security warnings; the remaining warnings are cleanup work rather than lint-blocking errors.
- The literal every-role/every-method mutation permutation, password-recovery delivery adapter, and browser visual smoke remain outstanding. Docker Desktop is running as an app, but its `desktop-linux` engine/API is unresponsive; the isolated rehearsals used Homebrew PostgreSQL 16 instead.

### Machine-token rotation runbook

1. Generate a new random token of at least 32 characters in the deployment secret manager; do not place it in source control, chat, audit details, or shell history.
2. Update `HOT_FOLDER_INGEST_TOKEN` and the approved scanner configuration together, then restart the Next.js process and the hot-folder watcher.
3. Verify the old token receives `401`, the new token succeeds only for the configured `HOT_FOLDER_SOURCE_STATION` and `HOT_FOLDER_OFFICE_ID`, and no token value appears in logs.
4. Keep the rotation unchecked until this procedure is executed in the real deployment environment.

## Definition of done

- [x] No Critical or High authentication/authorization code findings remain in the reviewed and tested scope; deployment and explicitly unexercised operational follow-ups remain listed above.
- [x] Every API method has a documented policy and an exhaustive live shared-authentication boundary test; representative role/resource enforcement is live-tested and literal unexercised combinations remain listed above.
- [x] Every reviewed protected API performs current server-side principal validation.
- [x] Student ownership and reviewed office-isolation tests pass at source-contract level.
- [x] Session expiry and revocation tests pass.
- [x] Credential, recovery-token, 2FA, CSRF, and rate-limit tests pass.
- [x] Full lint and isolated local PostgreSQL verification pass; the production build and diff check pass independently.
- [x] No secrets were exposed and the unrelated `.DS_Store` worktree change was preserved.

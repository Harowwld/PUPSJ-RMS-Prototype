# MODULES.md — High-Risk Subsystem Contracts
## Engineering Contracts for Riskiest Modules

This document establishes immutable engineering contracts for the two highest-risk subsystems within the PUPSJ Records Keeping System (PUPSJ-RMS) prototype:
1. **Module 1: `backup_disaster_recovery`** (External media, cryptographic encryption, database rebuild)
2. **Module 2: `identity_and_student_records`** (Private student PII, physical storage layout, ACID allocation)

---

## Module 1: `backup_disaster_recovery`

### 1. Owns
* **Database Tables:** `backups` (metadata, checksums, sync status).
* **Filesystem Paths:**
  * Local backups directory: `.local/backups/*.zip.enc`
  * Local temporary staging: `.local/backups/*.deleting-*`, `.local/backups/*.tmp`
  * Secondary external archive volume: `.local/external_media/PUPSJ_BACKUPS/*.zip.enc` (or connected physical drive mount).
* **Cryptographic Lifecycle:**
  * Encryption format: AES-256-GCM with PBKDF2/scrypt derived key or `BACKUP_ENCRYPTION_KEY`
  * Magic header: `PUPSBK1` (7 bytes)
  * Initialization Vector: 12 bytes IV
  * Authentication Tag: 16 bytes GCM tag
  * Integrity Digest: SHA-256 cryptographic checksums stored in database registry.

### 2. Public Interface
```javascript
// Creates full system or office-scoped snapshot (SQL dump + uploads)
export async function createEncryptedBackupArchive(options: {
  scope: 'system' | 'office',
  officeId?: string,
  user?: StaffUser,
  skipSync?: boolean
}): Promise<BackupRecord>;

// Decrypts and unpacks archive into memory with full GCM authentication
export function decryptBackupBuffer(encryptedBuffer: Buffer): Buffer;

// Restores PostgreSQL relational tables and physical files from an archive
export async function restoreEncryptedBackupArchive(
  fileBuffer: Buffer,
  options: { user: StaffUser, scope?: string, officeId?: string }
): Promise<RestoreResult>;

// Synchronizes backup file to attached external media (append-only)
export async function syncBackupToExternal(backupId: number): Promise<boolean>;

// Deletes local archive and database record (NEVER touches external drive)
export async function deleteBackupAndFile(id: number, backupRecord?: BackupRecord): Promise<number>;
```

### 3. Consistency
* **Database State:** `CONSISTENT` (PostgreSQL ACID for registry, transactions, and sequence resynchronization).
* **External Storage Sync:** `EVENTUAL` (Automated background event-driven replication to physical disk with live WebSocket status broadcast).

### 4. Promises
1. **Zero-Tamper Guarantee:** An archive with an altered initialization vector, ciphertext byte, or authentication tag will fail immediately during GCM deciphering with `Failed to decrypt backup. Invalid key or corrupted file.` and will **NEVER** touch the PostgreSQL database schema or overwrite existing files.
2. **Immutable External Storage:** No web UI route, API handler, or automated agent operation will invoke deletion or truncation against files residing on the external storage volume (`getExternalBackupsDir()`).
3. **Safety Snapshot Guarantee:** A pre-restore safety snapshot is automatically generated and verified before any destructive restore SQL is executed against the PostgreSQL database.
4. **Sequence Alignment:** Every successful restore triggers a serial sequence resync (`SELECT setval(...)`) on all primary keys to guarantee subsequent transactional `INSERT` statements never throw duplicate key constraint errors.

### 5. Failure Behavior
* **External Drive Disconnected / Unwritable:** The local backup succeeds and registers with `status_external = 'Failed'`. The user receives an informative warning toast; system execution does not crash.
* **Corrupt Archive on Restore:** Decryption throws synchronously; transaction aborts; database remains completely untouched.
* **Database URL Missing:** Restore throws immediately without staging files.

### 6. The Hard Part
* Ensuring cross-platform database dumps and restores operate reliably across both native host PostgreSQL installations and Docker container runtimes (`pupsj-rms-postgres`) without socket permission errors.
* Ensuring large multi-gigabyte ZIP archives stream into temporary directories without causing Node.js heap exhaustion (`ERR_STRING_TOO_LONG` / `FATAL ERROR: Ineffective mark-compacts near heap limit`).

### 7. Red Tests
* `tests/red/restore_meets_rpo.test.mjs` — Verifies tamper detection and safe restore abort on corrupted ciphertext.
* `tests/red/agent_role_cannot_destroy.test.mjs` — Verifies external volume copies are immune to application deletion.

### 8. Not Allowed
* ❌ Deleting, unlinking, or renaming files in `getExternalBackupsDir()`.
* ❌ Executing SQL restore statements outside an explicit PostgreSQL database transaction.
* ❌ Storing unencrypted plaintext SQL dumps or backup ZIP files on disk.

---

## Module 2: `identity_and_student_records`

### 1. Owns
* **Database Tables:**
  * `students` (student_no, encrypted name, course_code, year_level, section, status, physical storage coordinates)
  * `student_identity_profiles` (demographic identity, student email)
  * `student_office_memberships` (office isolation mapping)
  * `student_accounts` (auth credentials, hashed passwords)
  * `staff` (personnel accounts, roles, hashed passwords)
  * `rate_limits`, `rate_limit_hits` (shared IP burst counters)
* **Storage Coordinates:**
  * Physical archive coordinates: `storage_room` (INTEGER), `storage_cabinet` (TEXT: A-H), `storage_drawer` (INTEGER: 1-4).

### 2. Public Interface
```javascript
// Creates a new student record with validated academic taxonomy and physical coordinates
export async function createStudent(data: {
  studentNo: string,
  name: string,
  courseCode: string,
  yearLevel: number | string,
  section: string,
  room?: number,
  cabinet?: string,
  drawer?: number,
  status?: string,
  officeId: string
}): Promise<Student>;

// Updates an existing student record with optimistic locking and storage reassignment
export async function updateStudent(
  studentNo: string,
  updates: Partial<StudentUpdateData>,
  officeId: string
): Promise<Student>;

// Searches students by query, course, section, or physical storage room
export async function getStudents(filters: {
  search?: string,
  courseCode?: string,
  yearLevel?: number,
  section?: string,
  room?: number,
  cabinet?: string,
  drawer?: number,
  officeId: string,
  page?: number,
  limit?: number
}): Promise<{ students: Student[], total: number }>;

// Verifies and records rate limit hits; sheds bursts exceeding thresholds
export async function checkRateLimit(
  ip: string,
  action: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean, remaining: number, resetSeconds: number }>;
```

### 3. Consistency
* **Consistency Model:** `CONSISTENT` (Strict serializable ACID transactions).
* All student registration, profile updates, and physical drawer allocations execute inside PostgreSQL `transaction()` blocks with `FOR UPDATE` row locks on section and course taxonomies.

### 4. Promises
1. **No Orphan Coordinates:** A student record cannot be created or updated with invalid academic course codes or unmapped sections.
2. **PII Encryption at Rest:** Student names and identity attributes are encrypted using institutional AES-256 PII encryption before being written to PostgreSQL.
3. **Office Tenancy Isolation:** Staff belonging to Office A (e.g. OSAS) cannot read or mutate unlinked student records belonging exclusively to Office B (e.g. Registrar) without explicit active membership.
4. **Burst Shedding:** Public and login authentication attempts exceeding the configured threshold (e.g., 5 attempts / 15 minutes) are immediately shed with HTTP 429 (`Too Many Requests`) via the shared database-backed rate limit table.

### 5. Failure Behavior
* **Course Code or Section Missing:** Transaction rolls back with clear error: `Invalid courseCode: <CODE>` or `Section <SEC> is not defined for course <CODE>`.
* **Duplicate Student Number:** Transaction aborts with `Student number <NO> is already registered.`
* **Rate Limit Exceeded:** Caller receives `{ allowed: false, remaining: 0, resetSeconds: <SEC> }`.

### 6. The Hard Part
* Preventing concurrency race conditions when two concurrent staff members assign students to the same physical cabinet drawer or section during peak semester onboarding.
* Handling fuzzy search and accent-insensitive sorting across encrypted student names without leaking plaintext to database logs.

### 7. Red Tests
* `tests/red/pool_holds_at_burst.test.mjs` — Verifies rate limit bursts are shed cleanly when threshold is exceeded.
* `tests/red/student_coordinate_integrity.test.mjs` — Verifies invalid section/course taxonomy and duplicate keys are rejected with rollback.

### 8. Not Allowed
* ❌ Writing unparameterized SQL strings or interpolating variables directly into query strings.
* ❌ Storing unencrypted plaintext student full names in the `students` table.
* ❌ Overwriting an existing student profile without verifying office tenancy membership.

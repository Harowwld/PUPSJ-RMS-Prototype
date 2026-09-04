import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import AdmZip from "adm-zip";
import { execFileSync } from "node:child_process";
import { isSystemAdminRole } from "./roleUtils.js";
import { clearHealthCache } from "./healthCache.js";

const BACKUP_ENC_MAGIC = Buffer.from("PUPSBK1", "utf8");
const BACKUP_ENC_ALGO = "aes-256-gcm";
const BACKUP_ENC_IV_LENGTH = 12;
const BACKUP_ENC_TAG_LENGTH = 16;

export function getLocalDir() {
  return process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");
}

export function getBackupsDir() {
  const dir = path.join(getLocalDir(), "backups");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getExternalBackupsDir() {
  const explicit = process.env.EXTERNAL_BACKUP_PATH;
  let dir = path.join(getLocalDir(), "external_media");

  if (explicit) {
    try {
      // Check if the drive root exists (e.g. E:\)
      const root = path.parse(explicit).root;
      if (fs.existsSync(root)) {
        dir = explicit;
      } else {
        console.warn(`[BACKUP] External path '${explicit}' is unreachable (drive not found). Falling back to local external_media.`);
      }
    } catch (e) {
      console.warn(`[BACKUP] Error checking external path '${explicit}':`, e.message);
    }
  }

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function createBackupRecord({
  filename,
  sizeBytes,
  checksum,
  encryptionKeyId,
  scope = "office",
  officeId = null,
  backupType = "Full",
  createdBy = null,
}) {
  const res = await dbRun(
    `
    INSERT INTO backups (
      filename,
      size_bytes,
      checksum,
      encryption_key_id,
      status_local,
      scope,
      office_id,
      backup_type,
      created_by
    ) VALUES (?, ?, ?, ?, 'Success', ?, ?, ?, ?)
  `,
    [
      filename,
      sizeBytes,
      checksum,
      encryptionKeyId || null,
      scope || "office",
      officeId || null,
      backupType || "Full",
      createdBy || null,
    ]
  );
  return await getBackupById(res.lastInsertRowid);
}

export async function listBackups(filters = {}) {
  const { search, startDate, endDate, scope, officeId } = filters;
  let sql = `SELECT * FROM backups`;
  const params = [];
  const conditions = [];

  if (scope) {
    conditions.push(`scope = ?`);
    params.push(scope);
  }

  if (officeId) {
    conditions.push(`office_id = ?`);
    params.push(officeId);
  }

  if (search) {
    conditions.push(`filename LIKE ?`);
    params.push(`%${search}%`);
  }

  if (startDate) {
    if (startDate.includes("T") || startDate.includes(":")) {
      conditions.push(`created_at >= ?::timestamptz`);
    } else {
      conditions.push(`created_at::date >= ?::date`);
    }
    params.push(startDate);
  }

  if (endDate) {
    if (endDate.includes("T") || endDate.includes(":")) {
      conditions.push(`created_at <= ?::timestamptz`);
    } else {
      conditions.push(`created_at::date <= ?::date`);
    }
    params.push(endDate);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(" AND ");
  }

  sql += ` ORDER BY created_at DESC`;

  const rows = await dbAll(sql, params);
  console.log(`[REPO] listBackups returned ${rows.length} rows.`);
  return rows;
}

export async function getBackupById(id) {
  return await dbGet(`SELECT * FROM backups WHERE id = ?`, [id]);
}

export async function updateBackupStatus(id, field, status) {
  // field should be status_local or status_external
  const allowed = ["status_local", "status_external"];
  if (!allowed.includes(field)) return;

  await dbRun(
    `UPDATE backups SET ${field} = ? WHERE id = ?`,
    [status, id]
  );
}

export async function deleteBackupRecord(id) {
  const result = await dbRun(`DELETE FROM backups WHERE id = ?`, [id]);
  return result.changes;
}

export async function syncBackupExternally(id) {
  try {
    console.log(`[SYNC DEBUG] Starting background sync for ID: ${id}`);
    
    // Give the database a moment to fully settle the initial record
    await new Promise(r => setTimeout(r, 1000));

    const backup = await getBackupById(id);
    if (!backup) {
      console.error(`[SYNC DEBUG] CRITICAL: Backup record ${id} not found in DB.`);
      throw new Error("Backup record not found");
    }

    const backupsDir = getBackupsDir();
    const sourcePath = path.join(backupsDir, backup.filename);
    console.log(`[SYNC DEBUG] Source path: ${sourcePath}`);

    if (!fs.existsSync(sourcePath)) {
      console.error(`[SYNC DEBUG] CRITICAL: Source file missing on disk: ${sourcePath}`);
      throw new Error(`Source file not found at: ${sourcePath}`);
    }

    // Ensure PUPSJRMS Backups folder exists on the external drive
    const externalDir = getExternalBackupsDir();
    console.log(`[SYNC DEBUG] External base dir: ${externalDir}`);

    // Create a dated subfolder: YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const dailyDir = path.join(externalDir, today);
    if (!fs.existsSync(dailyDir)) {
      fs.mkdirSync(dailyDir, { recursive: true });
      console.log(`[SYNC DEBUG] Created daily folder: ${dailyDir}`);
    }

    const destPath = path.join(dailyDir, backup.filename);
    console.log(`[SYNC DEBUG] Destination path: ${destPath}`);

    console.log(`[SYNC DEBUG] Transferring ${backup.filename} to external drive...`);
    
    // Physical copy into the daily subfolder
    fs.copyFileSync(sourcePath, destPath);
    console.log(`[SYNC DEBUG] Physical copy complete.`);

    // Update DB status
    await updateBackupStatus(id, "status_external", "Success");
    console.log(`[SYNC DEBUG] Database updated to 'Success' for ID: ${id}`);
    
    return { ok: true, path: destPath, dailyDir };
  } catch (error) {
    console.error(`[SYNC DEBUG] ERROR for backup ${id}:`, error.message);
    try {
      await updateBackupStatus(id, "status_external", "Failed");
    } catch (dbErr) {
      console.error(`[SYNC DEBUG] Failed to record failure status in DB:`, dbErr.message);
    }
    throw error;
  }
}

function dumpPostgresTables(tables, targetSqlPath) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to create a PostgreSQL backup");
  }

  const tableArgs = [];
  if (Array.isArray(tables) && tables.length > 0) {
    for (const t of tables) {
      tableArgs.push("-t", t);
    }
  }

  try {
    execFileSync("pg_dump", [
      "--data-only",
      "--no-owner",
      "--no-privileges",
      ...tableArgs,
      "--file",
      targetSqlPath,
      process.env.DATABASE_URL,
    ]);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    try {
      const dockerArgs = [
        "exec",
        "pupsj-rms-postgres",
        "pg_dump",
        "--data-only",
        "--no-owner",
        "--no-privileges",
        "--username",
        "pupsj_rms",
        "--dbname",
        "pupsj_rms",
        ...tableArgs,
      ];
      const dockerDump = execFileSync("docker", dockerArgs, { encoding: "buffer" });
      fs.writeFileSync(targetSqlPath, dockerDump);
    } catch (dockerError) {
      throw new Error(
        dockerError.code === "ENOENT"
          ? "pg_dump is unavailable and Docker is not installed. Install PostgreSQL client tools or start the Docker-based database."
          : dockerError.stderr?.toString() || "Unable to create a PostgreSQL backup using the host or Docker database tools."
      );
    }
  }
}

export async function executeSystemBackup({ actorId = null } = {}) {
  const timestamp = new Date();
  const dateStr = timestamp.toISOString().split("T")[0]; // YYYY-MM-DD
  const timeStr = timestamp.toTimeString().split(" ")[0].replace(/:/g, "").slice(0, 4); // HHMM
  const backupFilename = `PUP-SYSTEM-GOVERNANCE-BACKUP-${dateStr}-${timeStr}.zip.enc`;

  const backupsDir = getBackupsDir();
  const backupPath = path.join(backupsDir, backupFilename);
  console.log(`[BACKUP] Creating System Governance Backup: ${backupPath}`);

  const localDir = getLocalDir();
  const tempDbPath = path.join(localDir, `system-backup-temp-${Date.now()}.sql`);

  // Governance tables only - NO student records or office files
  const governanceTables = [
    "offices",
    "modules",
    "office_modules",
    "staff",
    "security_questions",
    "staff_security_answers",
    "staff_recovery_codes",
    "global_audit_logs",
    "settings",
  ];

  dumpPostgresTables(governanceTables, tempDbPath);

  // Create ZIP archive containing only db.sql
  const zip = new AdmZip();
  if (fs.existsSync(tempDbPath)) {
    zip.addLocalFile(tempDbPath, "", "db.sql");
  }

  // Clean up temp SQL dump
  try {
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  } catch (e) {
    console.error("[BACKUP] Failed to cleanup temp db backup file:", e);
  }

  // Encrypt with AES-256-GCM
  const zipBuffer = zip.toBuffer();
  const encryptedBuffer = encryptBackupBuffer(zipBuffer);
  fs.writeFileSync(backupPath, encryptedBuffer);

  if (!fs.existsSync(backupPath) || fs.statSync(backupPath).size === 0) {
    throw new Error("Failed to write system backup ZIP file to disk or file is empty.");
  }

  const fileBuffer = fs.readFileSync(backupPath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  const checksum = hashSum.digest("hex");
  const sizeBytes = fileBuffer.length;

  const record = await createBackupRecord({
    filename: backupFilename,
    sizeBytes,
    checksum,
    scope: "system",
    officeId: null,
    backupType: "Governance",
    createdBy: actorId,
  });

  return record;
}

export async function executeOfficeBackup({ officeId = "registrar", actorId = null } = {}) {
  const normOffice = String(officeId || "registrar").toLowerCase().trim();
  const officeUpper = normOffice.toUpperCase();
  const timestamp = new Date();
  const dateStr = timestamp.toISOString().split("T")[0]; // YYYY-MM-DD
  const timeStr = timestamp.toTimeString().split(" ")[0].replace(/:/g, "").slice(0, 4); // HHMM
  const backupFilename = `PUP-${officeUpper}-BACKUP-${dateStr}-${timeStr}.zip.enc`;

  const backupsDir = getBackupsDir();
  const backupPath = path.join(backupsDir, backupFilename);
  console.log(`[BACKUP] Creating Office Backup for [${normOffice}]: ${backupPath}`);

  const localDir = getLocalDir();
  const tempDbPath = path.join(localDir, `${normOffice}-backup-temp-${Date.now()}.sql`);

  // Target tables based on office partition
  let officeTables = [];
  if (normOffice === "registrar") {
    officeTables = [
      "students",
      "student_accounts",
      "documents",
      "document_requests",
      "document_types",
      "courses",
      "sections",
      "ingest_queue",
      "scan_sessions",
      "scan_session_incoming",
      "recognition_templates",
      "transaction_updates",
    ];
  } else if (normOffice === "osas") {
    officeTables = [
      "event_proposals",
      "transaction_updates",
      "courses",
      "sections",
    ];
  } else {
    // Default / general office
    officeTables = [
      "transaction_updates",
      "courses",
      "sections",
    ];
  }

  dumpPostgresTables(officeTables, tempDbPath);

  // Create ZIP archive
  const zip = new AdmZip();

  if (fs.existsSync(tempDbPath)) {
    zip.addLocalFile(tempDbPath, "", "db.sql");
  }

  // Include office-specific partition uploads/storage
  const officeStorageDir = path.join(localDir, "storage", normOffice);
  if (fs.existsSync(officeStorageDir)) {
    zip.addLocalFolder(officeStorageDir, `storage/${normOffice}`);
  }

  // If registrar, also package legacy uploads folder if exists
  if (normOffice === "registrar") {
    const legacyUploadsDir = path.join(localDir, "uploads");
    if (fs.existsSync(legacyUploadsDir)) {
      zip.addLocalFolder(legacyUploadsDir, "uploads");
    }
  }

  // Clean up temp SQL dump
  try {
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  } catch (e) {
    console.error("[BACKUP] Failed to cleanup temp db backup file:", e);
  }

  // Encrypt with AES-256-GCM
  const zipBuffer = zip.toBuffer();
  const encryptedBuffer = encryptBackupBuffer(zipBuffer);
  fs.writeFileSync(backupPath, encryptedBuffer);

  if (!fs.existsSync(backupPath) || fs.statSync(backupPath).size === 0) {
    throw new Error(`Failed to write office backup ZIP file to disk or file is empty.`);
  }

  const fileBuffer = fs.readFileSync(backupPath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  const checksum = hashSum.digest("hex");
  const sizeBytes = fileBuffer.length;

  const record = await createBackupRecord({
    filename: backupFilename,
    sizeBytes,
    checksum,
    scope: "office",
    officeId: normOffice,
    backupType: "Full",
    createdBy: actorId,
  });

  return record;
}

export async function executeBackup(options = {}) {
  if (options?.scope === "system") {
    return await executeSystemBackup({ actorId: options.actorId });
  }
  const officeId = options?.officeId || "registrar";
  return await executeOfficeBackup({ officeId, actorId: options.actorId });
}

function getBackupEncryptionKey() {
  const rawSecret =
    process.env.BACKUP_ENCRYPTION_KEY || process.env.JWT_SECRET || "";
  const normalized = String(rawSecret).trim();
  if (!normalized) {
    throw new Error(
      "Missing backup encryption secret. Set BACKUP_ENCRYPTION_KEY or JWT_SECRET."
    );
  }
  return crypto.createHash("sha256").update(normalized).digest();
}

export function isEncryptedBackupBuffer(buffer) {
  return (
    Buffer.isBuffer(buffer) &&
    buffer.length > BACKUP_ENC_MAGIC.length + BACKUP_ENC_IV_LENGTH + BACKUP_ENC_TAG_LENGTH &&
    buffer.subarray(0, BACKUP_ENC_MAGIC.length).equals(BACKUP_ENC_MAGIC)
  );
}

export function encryptBackupBuffer(plainBuffer) {
  if (!Buffer.isBuffer(plainBuffer)) {
    throw new Error("Backup encryption input must be a Buffer.");
  }
  const key = getBackupEncryptionKey();
  const iv = crypto.randomBytes(BACKUP_ENC_IV_LENGTH);
  const cipher = crypto.createCipheriv(BACKUP_ENC_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([BACKUP_ENC_MAGIC, iv, tag, encrypted]);
}

export function decryptBackupBuffer(encryptedBuffer) {
  if (!Buffer.isBuffer(encryptedBuffer)) {
    throw new Error("Backup decryption input must be a Buffer.");
  }
  if (!isEncryptedBackupBuffer(encryptedBuffer)) {
    return encryptedBuffer;
  }
  const key = getBackupEncryptionKey();
  const offsetIv = BACKUP_ENC_MAGIC.length;
  const offsetTag = offsetIv + BACKUP_ENC_IV_LENGTH;
  const offsetCipher = offsetTag + BACKUP_ENC_TAG_LENGTH;
  const iv = encryptedBuffer.subarray(offsetIv, offsetTag);
  const tag = encryptedBuffer.subarray(offsetTag, offsetCipher);
  const ciphertext = encryptedBuffer.subarray(offsetCipher);
  const decipher = crypto.createDecipheriv(BACKUP_ENC_ALGO, key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error("Failed to decrypt backup. Invalid key or corrupted file.");
  }
}

export function parseTablesFromDump(sqlContent) {
  const tables = new Set();

  const copyRegex = /COPY\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(/gi;
  let match;
  while ((match = copyRegex.exec(sqlContent)) !== null) {
    tables.add(match[1]);
  }

  const dataRegex = /--\s*Data for Name:\s*([a-zA-Z0-9_]+);/gi;
  while ((match = dataRegex.exec(sqlContent)) !== null) {
    tables.add(match[1]);
  }

  const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi;
  while ((match = createRegex.exec(sqlContent)) !== null) {
    tables.add(match[1]);
  }

  return Array.from(tables);
}

export function extractDataSql(sql) {
  if (!sql.includes("CREATE TABLE") && !sql.includes("ALTER TABLE")) {
    return sql;
  }

  const lines = sql.split("\n");
  const extractedLines = [];
  let inCopyBlock = false;

  for (const line of lines) {
    if (inCopyBlock) {
      extractedLines.push(line);
      if (line.trim() === "\\.") {
        inCopyBlock = false;
      }
      continue;
    }

    const trimmed = line.trim();
    if (trimmed.startsWith("COPY ") && trimmed.includes("FROM stdin;")) {
      inCopyBlock = true;
      extractedLines.push(line);
    } else if (
      trimmed.startsWith("SET ") ||
      trimmed.startsWith("SELECT pg_catalog.setval") ||
      trimmed.startsWith("\\restrict") ||
      trimmed.startsWith("\\unrestrict")
    ) {
      extractedLines.push(line);
    }
  }

  return extractedLines.join("\n");
}

export function restorePostgresSql(sqlContent) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to restore a PostgreSQL backup");
  }

  try {
    execFileSync("psql", [process.env.DATABASE_URL], {
      input: sqlContent,
      maxBuffer: 100 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error) {
    if (error.code !== "ENOENT") {
      const stderr = error.stderr ? error.stderr.toString() : error.message;
      throw new Error(`Database restore failed: ${stderr}`);
    }

    try {
      execFileSync(
        "docker",
        [
          "exec",
          "-i",
          "pupsj-rms-postgres",
          "psql",
          "--username",
          "pupsj_rms",
          "--dbname",
          "pupsj_rms",
        ],
        {
          input: sqlContent,
          maxBuffer: 100 * 1024 * 1024,
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
    } catch (dockerError) {
      if (dockerError.code === "ENOENT") {
        throw new Error(
          "psql is unavailable on the host and Docker is not running. Install PostgreSQL client tools or start the Docker-based database."
        );
      }
      const stderr = dockerError.stderr ? dockerError.stderr.toString() : dockerError.message;
      throw new Error(`Docker database restore failed: ${stderr}`);
    }
  }
}

export async function executeRestoreBackup(
  fileBuffer,
  { actorId = null, userRole = "Admin", userOffice = "registrar" } = {}
) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error("Backup restoration requires a valid file buffer.");
  }

  // 1. Decrypt if encrypted with AES-256-GCM (PUPSBK1 magic)
  const plainZipBuffer = decryptBackupBuffer(fileBuffer);

  // 2. Unzip archive
  let zip;
  try {
    zip = new AdmZip(plainZipBuffer);
  } catch (err) {
    throw new Error("Invalid backup file: Not a valid ZIP archive or failed to decrypt.");
  }

  const entries = zip.getEntries();
  if (!entries || entries.length === 0) {
    throw new Error("Backup archive is empty.");
  }

  // 3. Locate db.sql
  const dbEntry = entries.find(
    (e) => !e.isDirectory && (e.entryName === "db.sql" || e.entryName.endsWith("/db.sql"))
  );
  if (!dbEntry) {
    throw new Error("Invalid backup archive: missing 'db.sql'.");
  }

  const rawSql = dbEntry.getData().toString("utf8");
  const dataSql = extractDataSql(rawSql);
  const targetTables = parseTablesFromDump(dataSql.length > 0 ? dataSql : rawSql);

  if (targetTables.length === 0) {
    throw new Error("Backup database dump contains no recognized table data to restore.");
  }

  // 4. Role & Office Authorization Check
  const isSuper = isSystemAdminRole(userRole);
  const isGovernanceBackup = targetTables.some((t) =>
    ["staff", "offices", "modules", "office_modules", "global_audit_logs"].includes(t)
  );

  if (isGovernanceBackup && !isSuper) {
    throw new Error(
      "Unauthorized: System Governance backups can only be restored by a System Administrator."
    );
  }

  const normUserOffice = String(userOffice || "registrar").toLowerCase().trim();
  if (!isSuper) {
    if (normUserOffice === "osas") {
      const hasRegistrarOnlyTables = targetTables.some((t) =>
        ["students", "student_accounts", "documents", "document_requests", "recognition_templates"].includes(t)
      );
      if (hasRegistrarOnlyTables) {
        throw new Error("Unauthorized: You cannot restore Registrar records to OSAS.");
      }
    } else if (normUserOffice === "registrar") {
      const hasOsasOnlyTables = targetTables.some((t) => ["event_proposals"].includes(t));
      if (hasOsasOnlyTables) {
        throw new Error("Unauthorized: You cannot restore OSAS records to the Registrar office.");
      }
    }
  }

  // 5. Restore filesystem assets (storage/ and uploads/)
  const localDir = getLocalDir();
  let extractedFileCount = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const entryName = entry.entryName.replace(/\\/g, "/");
    if (entryName === "db.sql" || entryName.endsWith("/db.sql")) continue;

    // Security check: ensure path traversal is not possible
    const safeDestPath = path.resolve(localDir, entryName);
    if (!safeDestPath.startsWith(path.resolve(localDir))) {
      throw new Error(`Potentially malicious file path in backup archive: ${entryName}`);
    }

    // Role check for partition assets
    if (!isSuper) {
      if (normUserOffice === "registrar" && entryName.startsWith("storage/osas/")) {
        continue;
      }
      if (
        normUserOffice === "osas" &&
        (entryName.startsWith("storage/registrar/") || entryName.startsWith("uploads/"))
      ) {
        continue;
      }
    }

    fs.mkdirSync(path.dirname(safeDestPath), { recursive: true });
    fs.writeFileSync(safeDestPath, entry.getData());
    extractedFileCount++;
  }

  // 6. Execute SQL restoration inside a replica session role transaction
  const deleteStatements = targetTables
    .map((tbl) => `DELETE FROM ${tbl};`)
    .reverse()
    .join("\n");

  const restoreTransactionSql = `
BEGIN;
SET session_replication_role = 'replica';
${deleteStatements}
${dataSql}
SET session_replication_role = 'origin';
COMMIT;
`;

  restorePostgresSql(restoreTransactionSql);

  // 7. Update last restoration timestamp & clear health telemetry cache
  const now = new Date().toISOString();
  await dbRun(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ('last_restoration_at', ?, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [now]
  );
  clearHealthCache();

  return {
    ok: true,
    tablesRestored: targetTables,
    filesRestored: extractedFileCount,
    restoredAt: now,
  };
}


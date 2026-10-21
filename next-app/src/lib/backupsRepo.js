import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import AdmZip from "adm-zip";
import { execFileSync } from "node:child_process";
import { isSystemAdminRole } from "./roleUtils.js";
import { clearHealthCache } from "./healthCache.js";
import { detectExternalDrive } from "./externalDriveDetector.js";
import {
  buildRegistrarArchivalPath,
  buildOsasArchivalPath,
  generateRecordsCatalogCsv,
  generateManifestJson,
  computeBufferSha256,
  formatLocationCode,
} from "./archivalStructure.js";
import { decryptPII } from "./piiEncryption.js";

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

export function getBackupFilePath(filename, baseDir = getBackupsDir()) {
  const safeFilename = String(filename || "").trim();
  if (!safeFilename || path.basename(safeFilename) !== safeFilename) {
    throw new Error("Invalid backup filename.");
  }

  const root = path.resolve(/*turbopackIgnore: true*/ baseDir);
  const candidate = path.resolve(/*turbopackIgnore: true*/ root, safeFilename);
  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid backup path.");
  }
  return candidate;
}

export function createBackupFilename({ scope = "office", officeId, timestamp = new Date(), nonce = crypto.randomBytes(8).toString("hex") } = {}) {
  const dateStr = timestamp.toISOString().split("T")[0];
  const timeStr = timestamp.toTimeString().split(" ")[0].replace(/:/g, "");
  const uniqueSuffix = String(nonce).replace(/[^a-zA-Z0-9]/g, "");
  if (scope === "system") {
    return `PUP-SYSTEM-GOVERNANCE-BACKUP-${dateStr}-${timeStr}-${uniqueSuffix}.zip.enc`;
  }
  const officeUpper = String(officeId || "").trim().toUpperCase();
  if (!officeUpper) throw new Error("Office scope is required to create an office backup.");
  return `PUP-${officeUpper}-BACKUP-${dateStr}-${timeStr}-${uniqueSuffix}.zip.enc`;
}

export function getPrincipalOfficeId(user) {
  const officeId = user?.officeId ?? user?.office_id;
  if (officeId) return String(officeId).trim().toLowerCase();
  const sec = String(user?.section || "").trim().toLowerCase();
  if (sec === "administrative" || sec === "records") return "registrar";
  if (sec.includes("osas")) return "osas";
  return null;
}

export function canAccessBackup(backup, user) {
  if (!backup || isSystemAdminRole(user?.role)) return Boolean(backup);
  const principalOffice = getPrincipalOfficeId(user);
  return Boolean(
    principalOffice &&
      String(backup.scope || "office").toLowerCase() === "office" &&
      String(backup.office_id || "").trim().toLowerCase() === principalOffice
  );
}

export function getExternalBackupsDir() {
  const driveInfo = detectExternalDrive();
  if (driveInfo.connected && driveInfo.isWritable && driveInfo.path) {
    let targetDir = driveInfo.path;
    if (!driveInfo.isEmulated && path.basename(targetDir) !== "PUPSJ_BACKUPS") {
      targetDir = path.join(targetDir, "PUPSJ_BACKUPS");
    }
    if (!fs.existsSync(/*turbopackIgnore: true*/ targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return targetDir;
  }

  throw new Error("Cannot sync: No writable external drive detected. Reconnect the configured external storage drive.");
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

async function persistBackupArchive({ backupPath, filename, encryptedBuffer, ...recordFields }) {
  try {
    fs.writeFileSync(backupPath, encryptedBuffer);
    const stats = fs.statSync(backupPath);
    if (stats.size === 0) {
      throw new Error("Backup archive file is empty.");
    }

    const fileBuffer = fs.readFileSync(backupPath);
    const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    return await createBackupRecord({
      filename,
      sizeBytes: fileBuffer.length,
      checksum,
      ...recordFields,
    });
  } catch (error) {
    try {
      if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
    } catch (cleanupError) {
      console.error(`[BACKUP] Failed to remove incomplete archive ${backupPath}:`, cleanupError);
    }
    throw error;
  }
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
  // field should be status_local, status_external, or backup_type
  const allowed = ["status_local", "status_external", "backup_type"];
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

export async function deleteBackupAndFile(id, backupRecord) {
  const backup = backupRecord || await getBackupById(id);
  if (!backup) return null;

  const filePath = getBackupFilePath(backup.filename, getBackupsDir());
  const stagedPath = `${filePath}.deleting-${crypto.randomUUID()}`;
  let fileStaged = false;
  if (fs.existsSync(filePath)) {
    fs.renameSync(filePath, stagedPath);
    fileStaged = true;
  }

  let changes;
  try {
    changes = await deleteBackupRecord(id);
  } catch (error) {
    if (fileStaged) {
      try {
        fs.renameSync(stagedPath, filePath);
      } catch (restoreError) {
        throw new AggregateError([error, restoreError], `Backup deletion failed and the staged archive could not be restored: ${stagedPath}`);
      }
    }
    throw error;
  }

  let cleanupPending = false;
  if (fileStaged) {
    try {
      fs.unlinkSync(stagedPath);
    } catch (error) {
      cleanupPending = true;
      console.error(`Deleted backup ${id}, but could not remove staged archive ${stagedPath}:`, error);
    }
  }

  return { backup, deleted: changes > 0, cleanupPending };
}

const activeSyncPromises = new Map();

export async function syncBackupExternally(id) {
  const normalizedId = String(id);
  if (activeSyncPromises.has(normalizedId)) {
    return activeSyncPromises.get(normalizedId);
  }

  const syncPromise = (async () => {
    let temporaryPath;
    try {
      const backup = await getBackupById(id);
      if (!backup) {
        console.error(`[SYNC DEBUG] CRITICAL: Backup record ${id} not found in DB.`);
        throw new Error("Backup record not found");
      }

      const backupsDir = getBackupsDir();
      const sourcePath = getBackupFilePath(backup.filename, backupsDir);

      if (!fs.existsSync(sourcePath)) {
        throw new Error("Source backup file is unavailable.");
      }

      // Ensure PUPSJRMS Backups folder exists on the external drive
      const externalDir = getExternalBackupsDir();

      // Create a dated subfolder: YYYY-MM-DD
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const dailyDir = path.join(/*turbopackIgnore: true*/ externalDir, today);
      if (!fs.existsSync(/*turbopackIgnore: true*/ dailyDir)) {
        fs.mkdirSync(dailyDir, { recursive: true });
      }

      const destPath = getBackupFilePath(backup.filename, dailyDir);
      
      temporaryPath = `${destPath}.${crypto.randomBytes(8).toString("hex")}.partial`;
      fs.copyFileSync(sourcePath, temporaryPath, fs.constants.COPYFILE_EXCL);
      const copiedChecksum = crypto.createHash("sha256").update(fs.readFileSync(/*turbopackIgnore: true*/ temporaryPath)).digest("hex");
      if (!backup.checksum || copiedChecksum !== backup.checksum) {
        throw new Error("External backup checksum verification failed.");
      }
      fs.renameSync(temporaryPath, destPath);
      temporaryPath = null;

      // Update DB status
      await updateBackupStatus(id, "status_external", "Success");
      
      return { ok: true };
    } catch (error) {
      if (temporaryPath) {
        try {
          fs.unlinkSync(temporaryPath);
        } catch (cleanupError) {
          if (cleanupError.code !== "ENOENT") console.error("Failed to remove incomplete external backup:", cleanupError.message);
        }
      }
      console.error(`[SYNC DEBUG] ERROR for backup ${id}:`, error.message);
      try {
        await updateBackupStatus(id, "status_external", "Failed");
      } catch (dbErr) {
        console.error(`[SYNC DEBUG] Failed to record failure status in DB:`, dbErr.message);
      }
      throw error;
    } finally {
      activeSyncPromises.delete(normalizedId);
    }
  })();

  activeSyncPromises.set(normalizedId, syncPromise);
  return syncPromise;
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
      const dockerDump = execFileSync("docker", dockerArgs, {
        encoding: "buffer",
        maxBuffer: 100 * 1024 * 1024,
      });
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

export async function executeSystemBackup({ actorId = null, backupType = "Governance" } = {}) {
  const backupFilename = createBackupFilename({ scope: "system" });

  const backupsDir = getBackupsDir();
  const backupPath = getBackupFilePath(backupFilename, backupsDir);

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
  return await persistBackupArchive({
    backupPath,
    filename: backupFilename,
    encryptedBuffer,
    scope: "system",
    officeId: null,
    backupType,
    createdBy: actorId,
  });
}

async function packageOfficeRecordsIntoZip(zip, normOffice, localDir, backupType = "Full") {
  const manifestRecords = [];
  const handledStorageFilenames = new Set();
  const seenDocCounts = new Map();

  let docRows = [];
  try {
    docRows = await dbAll(
      `SELECT d.id, d.office_id, d.student_no, d.student_name, d.organization_id, d.doc_type,
              d.original_filename, d.storage_filename, d.mime_type, d.size_bytes, d.created_at,
              s.name AS s_name, s.course_code, s.year_level, s.section,
              s.storage_room AS room, s.storage_cabinet AS cabinet, s.storage_drawer AS drawer,
              o.name AS org_name, o.category AS org_category,
              o.storage_room AS org_room, o.storage_cabinet AS org_cabinet, o.storage_drawer AS org_drawer
         FROM documents d
    LEFT JOIN students s ON d.student_no = s.student_no
    LEFT JOIN student_organizations o ON d.organization_id = o.id
        WHERE d.office_id = ?
        ORDER BY d.id ASC`,
      [normOffice]
    );
  } catch (err) {
    console.warn("[BACKUP] Warning: Could not query documents metadata for structured archiving:", err.message);
  }

  const officeUploadsDir = path.join(localDir, "storage", normOffice, "uploads");
  const officeBaseDir = path.join(localDir, "storage", normOffice);
  const legacyUploadsDir = path.join(localDir, "uploads");

  for (const row of (docRows || [])) {
    if (!row.storage_filename) continue;

    let diskPath = null;
    const pathInOffice = path.join(officeUploadsDir, row.storage_filename);
    const pathInLegacy = path.join(legacyUploadsDir, row.storage_filename);
    const pathInBaseOffice = path.join(officeBaseDir, row.storage_filename);

    if (fs.existsSync(pathInOffice)) {
      diskPath = pathInOffice;
    } else if (fs.existsSync(pathInLegacy)) {
      diskPath = pathInLegacy;
    } else if (fs.existsSync(pathInBaseOffice)) {
      diskPath = pathInBaseOffice;
    }

    if (!diskPath) {
      continue;
    }

    const dupKey = `${row.student_no || row.organization_id || "gen"}_${row.doc_type}`;
    const dupIndex = seenDocCounts.get(dupKey) || 0;
    seenDocCounts.set(dupKey, dupIndex + 1);

    let rawStudentName = row.student_name || row.s_name || "STUDENT";
    if (typeof rawStudentName === "string" && rawStudentName.startsWith("enc:v1:")) {
      try {
        const dec = decryptPII(rawStudentName);
        if (dec && !dec.startsWith("enc:v1:")) rawStudentName = dec;
      } catch {}
    }

    let archivePath;
    let entityType;
    let entityId;
    let entityName;
    let academicYear;
    let programOrCategory;
    let section;
    let room;
    let cabinet;
    let drawer;

    if (row.organization_id) {
      entityType = "Organization";
      entityId = row.organization_id;
      entityName = row.org_name || rawStudentName || "Organization";
      academicYear = row.created_at ? new Date(row.created_at).getFullYear().toString() : "2024";
      programOrCategory = row.org_category || "Organizations";
      section = "";
      room = row.org_room;
      cabinet = row.org_cabinet;
      drawer = row.org_drawer;

      archivePath = buildOsasArchivalPath({
        orgId: entityId,
        orgName: entityName,
        category: programOrCategory,
        academicYear,
        room,
        cabinet,
        drawer,
        docType: row.doc_type,
        originalFilename: row.original_filename,
        duplicateIndex: dupIndex,
      });
    } else {
      entityType = "Student";
      entityId = row.student_no || "STUDENT";
      entityName = rawStudentName;
      academicYear = row.year_level || (row.student_no && /^\d{4}/.test(row.student_no) ? row.student_no.substring(0, 4) : "2024");
      programOrCategory = row.course_code || "GENERAL";
      section = row.section || "1";
      room = row.room;
      cabinet = row.cabinet;
      drawer = row.drawer;

      archivePath = buildRegistrarArchivalPath({
        studentNo: entityId,
        studentName: entityName,
        academicYear,
        courseCode: programOrCategory,
        section,
        room,
        cabinet,
        drawer,
        docType: row.doc_type,
        originalFilename: row.original_filename,
        duplicateIndex: dupIndex,
      });
    }

    try {
      const fileBuffer = fs.readFileSync(diskPath);
      const sha256 = computeBufferSha256(fileBuffer);
      zip.addFile(archivePath, fileBuffer);
      handledStorageFilenames.add(row.storage_filename);

      manifestRecords.push({
        documentId: row.id,
        officeId: normOffice,
        entityType,
        entityId,
        entityName,
        academicYear: String(academicYear),
        programOrCategory,
        section: String(section || ""),
        docType: row.doc_type || "Document",
        physicalLocation: {
          room: room != null ? Number(room) : 1,
          cabinet: cabinet || "A",
          drawer: drawer != null ? Number(drawer) : 1,
          code: formatLocationCode(room, cabinet, drawer),
        },
        originalFilename: row.original_filename || "",
        storageFilename: row.storage_filename,
        archivePath,
        sizeBytes: fileBuffer.length,
        sha256,
      });
    } catch (readErr) {
      console.error(`[BACKUP] Failed reading ${diskPath}:`, readErr.message);
    }
  }

  // Also include any raw files on disk not linked in documents (e.g. pending ingest files)
  const scanDirectories = [
    { dir: officeUploadsDir, targetSubfolder: "records/_raw_assets" },
  ];
  if (normOffice === "registrar") {
    scanDirectories.push({ dir: legacyUploadsDir, targetSubfolder: "records/_raw_assets" });
  }

  for (const { dir, targetSubfolder } of scanDirectories) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isFile() && !handledStorageFilenames.has(file)) {
            const rawBuffer = fs.readFileSync(fullPath);
            const rawSha256 = computeBufferSha256(rawBuffer);
            const rawArchivePath = `${targetSubfolder}/${file}`;
            zip.addFile(rawArchivePath, rawBuffer);
            handledStorageFilenames.add(file);

            manifestRecords.push({
              documentId: null,
              officeId: normOffice,
              entityType: "RawAsset",
              entityId: file,
              entityName: file,
              academicYear: "",
              programOrCategory: "RawAsset",
              section: "",
              docType: "RawFile",
              physicalLocation: null,
              originalFilename: file,
              storageFilename: file,
              archivePath: rawArchivePath,
              sizeBytes: rawBuffer.length,
              sha256: rawSha256,
            });
          }
        }
      } catch (scanErr) {
        console.warn(`[BACKUP] Failed scanning unmapped directory ${dir}:`, scanErr.message);
      }
    }
  }

  // Add RECORDS_CATALOG.csv
  const csvContent = generateRecordsCatalogCsv(manifestRecords);
  zip.addFile("RECORDS_CATALOG.csv", Buffer.from(csvContent, "utf8"));

  // Add manifest.json
  const manifestContent = generateManifestJson({
    scope: "office",
    officeId: normOffice,
    backupType,
    records: manifestRecords,
  });
  zip.addFile("manifest.json", Buffer.from(manifestContent, "utf8"));

  return manifestRecords;
}

export async function executeOfficeBackup({ officeId, actorId = null, backupType = "Full" } = {}) {
  const normOffice = String(officeId || "").toLowerCase().trim();
  if (!normOffice) {
    throw new Error("Office scope is required to create an office backup.");
  }
  const backupFilename = createBackupFilename({ scope: "office", officeId: normOffice });

  const backupsDir = getBackupsDir();
  const backupPath = getBackupFilePath(backupFilename, backupsDir);

  const localDir = getLocalDir();
  const tempDbPath = path.join(localDir, `${normOffice}-backup-temp-${Date.now()}.sql`);

  // Target tables based on office partition
  let officeTables = [];
  if (normOffice === "registrar") {
    officeTables = [
      "students",
      "student_office_memberships",
      "student_accounts",
      "student_security_answers",
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

  // Package records into structured archival hierarchy combining academic anchors and physical markers
  await packageOfficeRecordsIntoZip(zip, normOffice, localDir, backupType);

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
  return await persistBackupArchive({
    backupPath,
    filename: backupFilename,
    encryptedBuffer,
    scope: "office",
    officeId: normOffice,
    backupType,
    createdBy: actorId,
  });
}

export async function executeBackup(options = {}) {
  if (options?.scope === "system") {
    return await executeSystemBackup({ actorId: options.actorId });
  }
  return await executeOfficeBackup({ officeId: options?.officeId, actorId: options.actorId });
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
    execFileSync("psql", ["-v", "ON_ERROR_STOP=1", process.env.DATABASE_URL], {
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
          "-v",
          "ON_ERROR_STOP=1",
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

export function countRowsFromDump(sqlContent) {
  const lines = sqlContent.split("\n");
  const tableCounts = {};
  let currentTable = null;
  let count = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("COPY ") && trimmed.includes("FROM stdin;")) {
      const match = trimmed.match(/COPY\s+(?:public\.)?([a-zA-Z0-9_]+)\b/i);
      if (match) {
        currentTable = match[1];
        count = 0;
      }
      continue;
    }
    if (currentTable) {
      if (trimmed === "\\.") {
        tableCounts[currentTable] = count;
        currentTable = null;
        count = 0;
      } else if (trimmed.length > 0) {
        count++;
      }
    }
  }
  return tableCounts;
}

export async function getBackupBufferById(id) {
  const backup = await getBackupById(id);
  if (!backup) {
    throw new Error(`Backup record with ID ${id} not found.`);
  }
  const backupsDir = getBackupsDir();
  const filePath = getBackupFilePath(backup.filename, backupsDir);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file '${backup.filename}' not found on storage.`);
  }
  return {
    buffer: fs.readFileSync(filePath),
    backup,
  };
}

export async function inspectBackupBuffer(fileBuffer) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error("Backup inspection requires a valid file buffer.");
  }

  const plainZipBuffer = decryptBackupBuffer(fileBuffer);
  let zip;
  try {
    zip = new AdmZip(plainZipBuffer);
  } catch {
    throw new Error("Invalid backup file: Not a valid ZIP archive or failed to decrypt.");
  }

  const entries = zip.getEntries();
  if (!entries || entries.length === 0) {
    throw new Error("Backup archive is empty.");
  }

  const dbEntry = entries.find(
    (e) => !e.isDirectory && (e.entryName === "db.sql" || e.entryName.endsWith("/db.sql"))
  );
  if (!dbEntry) {
    throw new Error("Invalid backup archive: missing 'db.sql'.");
  }

  const rawSql = dbEntry.getData().toString("utf8");
  const dataSql = extractDataSql(rawSql);
  const targetTables = parseTablesFromDump(dataSql.length > 0 ? dataSql : rawSql);
  const backupCounts = countRowsFromDump(dataSql.length > 0 ? dataSql : rawSql);

  const isGovernanceBackup = targetTables.some((t) =>
    ["staff", "offices", "modules", "office_modules", "global_audit_logs"].includes(t)
  );

  const manifestEntry = entries.find(
    (e) => !e.isDirectory && (e.entryName === "manifest.json" || e.entryName.endsWith("/manifest.json"))
  );
  const isStructuredArchive = Boolean(manifestEntry);
  const hasCatalog = Boolean(
    entries.find((e) => !e.isDirectory && (e.entryName === "RECORDS_CATALOG.csv" || e.entryName.endsWith("/RECORDS_CATALOG.csv")))
  );

  // Count files in archive (excluding db.sql and archive metadata)
  let archiveFileCount = 0;
  for (const entry of entries) {
    const name = entry.entryName.replace(/\\/g, "/");
    if (
      !entry.isDirectory &&
      name !== "db.sql" &&
      !name.endsWith("/db.sql") &&
      name !== "manifest.json" &&
      !name.endsWith("/manifest.json") &&
      name !== "RECORDS_CATALOG.csv" &&
      !name.endsWith("/RECORDS_CATALOG.csv")
    ) {
      archiveFileCount++;
    }
  }

  // Query live DB row counts for each target table
  const tableDiffs = [];
  for (const tbl of targetTables) {
    let liveRows = 0;
    try {
      const liveRes = await dbGet(`SELECT count(*)::int as count FROM ${tbl}`);
      liveRows = Number(liveRes?.count || 0);
    } catch (e) {
      console.warn(`[INSPECT] Could not query live count for table ${tbl}:`, e.message);
    }

    const backupRows = Number(backupCounts[tbl] || 0);
    const delta = backupRows - liveRows;

    tableDiffs.push({
      name: tbl,
      backupRows,
      liveRows,
      delta,
    });
  }

  return {
    ok: true,
    isGovernanceBackup,
    isStructuredArchive,
    hasCatalog,
    targetTables,
    tables: tableDiffs,
    totalArchiveFiles: archiveFileCount,
    hasDataSql: dataSql.length > 0,
  };
}

export async function executeRestoreBackup(
  fileBuffer,
  {
    actorId = null,
    userRole = "Admin",
    userOffice = null,
    mode = "overwrite",
    createSafetySnapshot = true,
  } = {}
) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error("Backup restoration requires a valid file buffer.");
  }
  if (!["merge", "overwrite"].includes(mode)) {
    throw new Error("Restore mode must be 'merge' or 'overwrite'.");
  }

  // 1. Decrypt if encrypted with AES-256-GCM (PUPSBK1 magic)
  const plainZipBuffer = decryptBackupBuffer(fileBuffer);

  // 2. Unzip archive
  let zip;
  try {
    zip = new AdmZip(plainZipBuffer);
  } catch {
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

  const normUserOffice = String(userOffice || "").toLowerCase().trim();
  if (!isSuper) {
    if (!normUserOffice) {
      throw new Error("An office-scoped administrator must have an office assignment.");
    }
    if (normUserOffice === "osas") {
      const hasRegistrarOnlyTables = targetTables.some((t) =>
        ["students", "student_accounts", "student_security_answers", "documents", "document_requests", "recognition_templates"].includes(t)
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

  // 5. Zero-Loss Pre-Restore Safety Snapshot
  let safetySnapshotRecord = null;
  if (createSafetySnapshot) {
    try {
      console.log(`[RESTORE] Taking automated Pre-Restore Safety Snapshot before '${mode}' restore...`);
      if (isSuper || isGovernanceBackup) {
        safetySnapshotRecord = await executeSystemBackup({
          actorId,
          backupType: "Pre-Restore Safety",
        });
      } else {
        safetySnapshotRecord = await executeOfficeBackup({
          officeId: normUserOffice || "registrar",
          actorId,
          backupType: "Pre-Restore Safety",
        });
      }
      if (safetySnapshotRecord) {
        await updateBackupStatus(safetySnapshotRecord.id, "backup_type", "Pre-Restore Safety");
        console.log(`[RESTORE] ✓ Safety snapshot saved: ${safetySnapshotRecord.filename}`);
      }
    } catch (snapErr) {
      console.warn("[RESTORE] Warning: Could not create safety snapshot:", snapErr.message);
    }
  }

  // 6. Restore filesystem assets
  const localDir = getLocalDir();
  let extractedFileCount = 0;

  const manifestEntry = entries.find(
    (e) => !e.isDirectory && (e.entryName === "manifest.json" || e.entryName.endsWith("/manifest.json"))
  );
  let manifest = null;
  if (manifestEntry) {
    try {
      manifest = JSON.parse(manifestEntry.getData().toString("utf8"));
    } catch (e) {
      console.warn("[RESTORE] Failed to parse manifest.json, using fallback extraction:", e.message);
    }
  }

  if (manifest?.records && Array.isArray(manifest.records) && manifest.records.length > 0) {
    const handledEntryNames = new Set(["db.sql", "manifest.json", "RECORDS_CATALOG.csv"]);

    for (const record of manifest.records) {
      if (!record.archivePath || !record.storageFilename) continue;

      const normArchivePath = record.archivePath.replace(/\\/g, "/");
      handledEntryNames.add(normArchivePath);

      const zipEntry = entries.find((e) => !e.isDirectory && e.entryName.replace(/\\/g, "/") === normArchivePath);
      if (!zipEntry) {
        console.warn(`[RESTORE] Archive entry not found for manifest path: ${record.archivePath}`);
        continue;
      }

      const targetOffice = String(record.officeId || normUserOffice || manifest.officeId || "registrar").toLowerCase();

      if (!isSuper) {
        if (normUserOffice === "registrar" && targetOffice === "osas") continue;
        if (normUserOffice === "osas" && targetOffice === "registrar") continue;
      }

      const officeUploadsDir = path.join(localDir, "storage", targetOffice, "uploads");
      const destPath = path.resolve(officeUploadsDir, record.storageFilename);

      const relOffice = path.relative(path.resolve(localDir), destPath);
      if (!relOffice || relOffice.startsWith("..") || path.isAbsolute(relOffice)) {
        throw new Error(`Potentially malicious file path in manifest: ${record.storageFilename}`);
      }

      if (mode === "merge" && fs.existsSync(destPath)) {
        continue;
      }

      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, zipEntry.getData());
      extractedFileCount++;

      // If registrar, also mirror to legacy uploads folder (.local/uploads/<storageFilename>)
      if (targetOffice === "registrar") {
        const legacyTarget = path.join(localDir, "uploads", record.storageFilename);
        if (mode !== "merge" || !fs.existsSync(legacyTarget)) {
          fs.mkdirSync(path.dirname(legacyTarget), { recursive: true });
          fs.writeFileSync(legacyTarget, zipEntry.getData());
        }
      }
    }

    // Any remaining raw assets in the archive that were not in manifest
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const entryName = entry.entryName.replace(/\\/g, "/");
      if (
        handledEntryNames.has(entryName) ||
        entryName === "db.sql" ||
        entryName.endsWith("/db.sql") ||
        entryName === "manifest.json" ||
        entryName.endsWith("/manifest.json") ||
        entryName === "RECORDS_CATALOG.csv" ||
        entryName.endsWith("/RECORDS_CATALOG.csv")
      ) {
        continue;
      }

      let destPath;
      if (entryName.startsWith("records/_raw_assets/")) {
        const filename = path.basename(entryName);
        const targetOffice = String(normUserOffice || manifest?.officeId || "registrar").toLowerCase();
        destPath = path.join(localDir, "storage", targetOffice, "uploads", filename);
      } else {
        const resolvedRoot = path.resolve(localDir);
        destPath = path.resolve(resolvedRoot, entryName);
        const rel = path.relative(resolvedRoot, destPath);
        if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) continue;
      }

      if (mode === "merge" && fs.existsSync(destPath)) continue;
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, entry.getData());
      extractedFileCount++;
    }
  } else {
    // Legacy fallback: direct folder extraction
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const entryName = entry.entryName.replace(/\\/g, "/");
      if (
        entryName === "db.sql" ||
        entryName.endsWith("/db.sql") ||
        entryName === "manifest.json" ||
        entryName === "RECORDS_CATALOG.csv"
      ) {
        continue;
      }

      const resolvedRoot = path.resolve(localDir);
      const safeDestPath = path.resolve(resolvedRoot, entryName);
      const relativeDestPath = path.relative(resolvedRoot, safeDestPath);
      if (!relativeDestPath || relativeDestPath === ".." || relativeDestPath.startsWith(`..${path.sep}`) || path.isAbsolute(relativeDestPath)) {
        throw new Error(`Potentially malicious file path in backup archive: ${entryName}`);
      }

      if (!isSuper) {
        if (normUserOffice === "registrar" && entryName.startsWith("storage/osas/")) continue;
        if (normUserOffice === "osas" && (entryName.startsWith("storage/registrar/") || entryName.startsWith("uploads/"))) continue;
      }

      if (mode === "merge" && fs.existsSync(safeDestPath)) continue;

      fs.mkdirSync(path.dirname(safeDestPath), { recursive: true });
      fs.writeFileSync(safeDestPath, entry.getData());
      extractedFileCount++;
    }
  }

  // 7. Execute SQL restoration
  let restoreTransactionSql = "";

  if (mode === "merge") {
    // SAFE MERGE / RECONCILIATION:
    // Create temp staging tables, route COPY into staging, then INSERT ... ON CONFLICT DO NOTHING
    const stagingCreates = targetTables
      .map((tbl) => `CREATE TEMP TABLE staging_${tbl} (LIKE public.${tbl} INCLUDING DEFAULTS) ON COMMIT DROP;`)
      .join("\n");

    let modifiedDataSql = dataSql;
    for (const tbl of targetTables) {
      const copyRegex = new RegExp(`COPY\\s+(?:public\\.)?(${tbl})\\b`, "gi");
      modifiedDataSql = modifiedDataSql.replace(copyRegex, `COPY staging_${tbl}`);
    }

    const mergeInserts = targetTables
      .map((tbl) => `INSERT INTO public.${tbl} SELECT * FROM staging_${tbl} ON CONFLICT DO NOTHING;`)
      .join("\n");

    restoreTransactionSql = `
BEGIN;
SET session_replication_role = 'replica';
${stagingCreates}
${modifiedDataSql}
${mergeInserts}
SET session_replication_role = 'origin';
COMMIT;
`;
  } else {
    // FULL OVERWRITE (Disaster Recovery):
    const deleteStatements = targetTables
      .map((tbl) => `DELETE FROM ${tbl};`)
      .reverse()
      .join("\n");

    restoreTransactionSql = `
BEGIN;
SET session_replication_role = 'replica';
${deleteStatements}
${dataSql}
SET session_replication_role = 'origin';
COMMIT;
`;
  }

  restorePostgresSql(restoreTransactionSql);

  // 8. Resynchronize serial sequences for all restored tables to prevent duplicate key errors
  for (const tbl of targetTables) {
    try {
      await dbRun(`
        DO $$
        DECLARE
          seq_name text;
        BEGIN
          seq_name := pg_get_serial_sequence('${tbl}', 'id');
          IF seq_name IS NOT NULL THEN
            EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(id) FROM %I), 1))', seq_name, '${tbl}');
          END IF;
        END $$;
      `);
    } catch {
      // Table may not have an id column or serial sequence; ignore safely
    }
  }

  // 9. Update last restoration timestamp & clear health telemetry cache
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
    mode,
    tablesRestored: targetTables,
    filesRestored: extractedFileCount,
    safetySnapshot: safetySnapshotRecord?.filename || null,
    restoredAt: now,
  };
}

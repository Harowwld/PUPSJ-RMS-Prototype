import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: ".env" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const testDatabase = `pupsj_restore_verify_${process.pid}`;
const sourceUrl = new URL(process.env.DATABASE_URL);
const testUrl = new URL(sourceUrl);
testUrl.pathname = `/${testDatabase}`;
const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "pupsj-restore-"));
const adminPool = new Pool({ connectionString: sourceUrl.toString(), max: 1 });
let created = false;

try {
  await adminPool.query(`CREATE DATABASE ${testDatabase}`);
  created = true;
  const testEnv = { ...process.env, DATABASE_URL: testUrl.toString(), LOCAL_DATA_DIR: dataDir };
  execFileSync(process.execPath, ["scripts/run-migrations.mjs"], { env: testEnv, stdio: "pipe" });

  const childScript = `
    import fs from "node:fs/promises";
    import path from "node:path";
    import dotenv from "dotenv";
    dotenv.config({ path: ".env" });
    const { executeRestoreBackup } = await import("./src/lib/backupsRepo.js");
    const { pool } = await import("./src/lib/postgres.js");
    try {
      for (const officeId of ["registrar", "osas"]) {
        const buffer = await fs.readFile(process.env.OFFICE_BACKUP_INPUT + "-" + officeId);
        await executeRestoreBackup(buffer, { userRole: "Admin", userOffice: officeId, mode: "merge", createSafetySnapshot: false });
      }
      for (const officeId of ["registrar", "osas"]) {
        await pool.query("UPDATE documents SET original_filename = 'changed-during-test.pdf' WHERE id = (SELECT id FROM documents WHERE office_id = $1 LIMIT 1)", [officeId]);
      }
      for (const officeId of ["registrar", "osas"]) {
        const buffer = await fs.readFile(process.env.OFFICE_BACKUP_INPUT + "-" + officeId);
        await executeRestoreBackup(buffer, { userRole: "Admin", userOffice: officeId, mode: "overwrite", createSafetySnapshot: false });
        const changed = await pool.query("SELECT office_id, count(*)::int AS count FROM documents WHERE original_filename = 'changed-during-test.pdf' GROUP BY office_id");
        if (officeId === "registrar" && (changed.rows.length !== 1 || changed.rows[0].office_id !== "osas")) {
          throw new Error("Registrar overwrite changed OSAS data or did not restore Registrar data");
        }
        if (officeId === "osas" && changed.rows.length) throw new Error("OSAS overwrite did not restore OSAS data");
      }
      const counts = await pool.query("SELECT office_id, count(*)::int AS count FROM documents GROUP BY office_id ORDER BY office_id");
      const files = await pool.query("SELECT office_id, storage_filename FROM documents");
      for (const row of files.rows) {
        await fs.access(path.join(process.env.LOCAL_DATA_DIR, "storage", row.office_id, "uploads", row.storage_filename));
      }
      const bylaws = await pool.query("SELECT storage_filename FROM organization_bylaws_versions");
      for (const row of bylaws.rows) {
        await fs.access(path.join(process.env.LOCAL_DATA_DIR, "storage", "osas", "bylaws", row.storage_filename));
      }
      const reports = await pool.query("SELECT narrative_storage_filename, liquidation_storage_filename FROM osas_post_event_reports");
      for (const row of reports.rows) {
        for (const filename of [row.narrative_storage_filename, row.liquidation_storage_filename].filter(Boolean)) {
          await fs.access(path.join(process.env.LOCAL_DATA_DIR, "storage", "osas", "uploads", filename));
        }
      }
      console.log(JSON.stringify({ documents: counts.rows, verifiedDocumentFiles: files.rows.length, verifiedBylawsFiles: bylaws.rows.length, verifiedPostEventReports: reports.rows.length }));
    } finally {
      await pool.end();
    }
  `;

  const { executeOfficeBackup, getBackupBufferById, deleteBackupAndFile } = await import("../src/lib/backupsRepo.js");
  const { pool: sourcePool } = await import("../src/lib/postgres.js");
  const inputPrefix = path.join(dataDir, "office-backup");
  const createdBackups = [];
  try {
    for (const officeId of ["registrar", "osas"]) {
      const backup = await executeOfficeBackup({ officeId, backupType: "Verification" });
      createdBackups.push(backup);
      const { buffer } = await getBackupBufferById(backup.id);
      await fs.writeFile(`${inputPrefix}-${officeId}`, buffer);
    }
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", childScript], {
      env: { ...testEnv, OFFICE_BACKUP_INPUT: inputPrefix },
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    console.log(`[office-backup-check] Restored records: ${output.trim()}`);
  } finally {
    for (const backup of createdBackups) await deleteBackupAndFile(backup.id, backup);
    await sourcePool.end();
  }
} finally {
  if (created) {
    await adminPool.query(`DROP DATABASE ${testDatabase} WITH (FORCE)`);
  }
  await adminPool.end();
  await fs.rm(dataDir, { recursive: true, force: true });
}

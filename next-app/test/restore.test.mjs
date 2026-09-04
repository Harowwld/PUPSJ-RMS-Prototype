import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import fs from "node:fs";
import path from "node:path";

const { query, queryOne } = await import("../src/lib/postgres.js");
const {
  executeOfficeBackup,
  executeSystemBackup,
  executeRestoreBackup,
  getBackupsDir,
} = await import("../src/lib/backupsRepo.js");

async function runTests() {
  console.log("=== Starting Backup Restoration Test Suite ===");

  // 1. Check database connectivity
  const initialOffices = await query("SELECT count(*) as count FROM offices");
  console.log("Initial offices count:", initialOffices[0].count);

  // 2. Ensure test student exists
  const testStudentNo = "TEST-RESTORE-001";
  await query(
    `INSERT INTO students (student_no, name, course_code, year_level, section, status)
     VALUES ($1, $2, 'BSIT', 3, '3-1', 'Active')
     ON CONFLICT (student_no) DO UPDATE SET name = EXCLUDED.name`,
    [testStudentNo, "ORIGINAL PRE-BACKUP NAME"]
  );

  const preBackupStudent = await queryOne("SELECT * FROM students WHERE student_no = $1", [testStudentNo]);
  console.log("Pre-backup student name:", preBackupStudent.name);

  // 3. Create an Office Backup (Registrar)
  console.log("\n--- Creating Office Backup ---");
  const backupRecord = await executeOfficeBackup({
    officeId: "registrar",
    actorId: "PUPSUPERADMIN-001",
  });
  console.log("Created backup record:", backupRecord.filename, "Size:", backupRecord.size_bytes);

  const backupFilePath = path.join(getBackupsDir(), backupRecord.filename);
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file missing at ${backupFilePath}`);
  }
  const backupBuffer = fs.readFileSync(backupFilePath);
  console.log("Read backup archive into memory, bytes:", backupBuffer.length);

  // 4. Mutate the student record to simulate data drift / corruption
  console.log("\n--- Mutating Student Record ---");
  await query("UPDATE students SET name = $1 WHERE student_no = $2", [
    "CORRUPTED MUTATED NAME AFTER BACKUP",
    testStudentNo,
  ]);
  const mutatedStudent = await queryOne("SELECT * FROM students WHERE student_no = $1", [testStudentNo]);
  console.log("Mutated student name in DB:", mutatedStudent.name);
  if (mutatedStudent.name !== "CORRUPTED MUTATED NAME AFTER BACKUP") {
    throw new Error("Failed to mutate student record for test.");
  }

  // 5. Execute Restoration
  console.log("\n--- Executing executeRestoreBackup ---");
  const restoreResult = await executeRestoreBackup(backupBuffer, {
    actorId: "PUPSUPERADMIN-001",
    userRole: "Admin",
    userOffice: "registrar",
  });
  console.log("Restore Result:", restoreResult);

  // 6. Assert that data was restored to original
  const restoredStudent = await queryOne("SELECT * FROM students WHERE student_no = $1", [testStudentNo]);
  console.log("Post-restore student name:", restoredStudent?.name);

  if (!restoredStudent || restoredStudent.name !== "ORIGINAL PRE-BACKUP NAME") {
    throw new Error(
      `Restoration failed! Expected 'ORIGINAL PRE-BACKUP NAME' but got '${restoredStudent?.name}'`
    );
  }
  console.log(">> SUCCESS: Student record verified to be restored to pre-backup snapshot!");

  // 7. Check last_restoration_at setting
  const lastRestoration = await queryOne("SELECT value FROM settings WHERE key = 'last_restoration_at'");
  console.log("Settings last_restoration_at:", lastRestoration?.value);
  if (!lastRestoration?.value) {
    throw new Error("Expected last_restoration_at to be set in settings table.");
  }
  console.log(">> SUCCESS: last_restoration_at timestamp verified!");

  // 8. Test Role Isolation: Regular office admin cannot restore system governance backup
  console.log("\n--- Testing Role Isolation ---");
  const sysBackupRecord = await executeSystemBackup({ actorId: "PUPSUPERADMIN-001" });
  const sysBackupBuffer = fs.readFileSync(path.join(getBackupsDir(), sysBackupRecord.filename));

  let unauthorizedBlocked = false;
  try {
    await executeRestoreBackup(sysBackupBuffer, {
      actorId: "PUPREGISTRAR-003",
      userRole: "Admin", // Office admin
      userOffice: "registrar",
    });
  } catch (err) {
    if (err.message.includes("Unauthorized") || err.message.includes("System Administrator")) {
      unauthorizedBlocked = true;
      console.log(">> SUCCESS: Office admin blocked from restoring system governance backup:", err.message);
    } else {
      throw err;
    }
  }

  if (!unauthorizedBlocked) {
    throw new Error("Security failure: Office admin was allowed to restore System Governance backup!");
  }

  // Clean up test student
  await query("DELETE FROM students WHERE student_no = $1", [testStudentNo]);

  // Clean up created test backup files from disk and database
  try {
    if (fs.existsSync(backupFilePath)) fs.unlinkSync(backupFilePath);
    const sysPath = path.join(getBackupsDir(), sysBackupRecord.filename);
    if (fs.existsSync(sysPath)) fs.unlinkSync(sysPath);
    await query("DELETE FROM backups WHERE id IN ($1, $2)", [backupRecord.id, sysBackupRecord.id]);
  } catch (e) {
    console.warn("Cleanup warning:", e.message);
  }

  console.log("\n=== ALL BACKUP RESTORATION TESTS PASSED ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});

import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import { executeSystemBackup, executeOfficeBackup } from "./backupsRepo.js";
import { createAuditLog } from "./auditLogsRepo.js";

const MANDATORY_CADENCE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days (72 hours)

/**
 * Next.js Instrumentation Hook — Auto Backup Scheduler
 *
 * Runs a continuous background scheduler that:
 * 1. Enforces the MANDATORY autonomous 3-day backup policy (unconfigurable baseline guarantee).
 * 2. Checks and executes any configured user schedules.
 */

export function initBackupScheduler() {
  if (typeof globalThis.__backupSchedulerStarted !== "undefined") return;
  globalThis.__backupSchedulerStarted = true;

  // Delay startup slightly to let DB connections initialize
  setTimeout(() => {
    startBackupScheduler();
  }, 10_000);
}

async function startBackupScheduler() {
  const CHECK_INTERVAL_MS = 60_000; // Check every 60 seconds

  console.log("[AutoBackup] Scheduler initialized with Mandatory 3-Day Policy. Checking every 60s.");

  setInterval(async () => {
    try {
      await checkAndRunScheduledBackups();
    } catch (err) {
      console.error("[AutoBackup] Scheduler tick error:", err.message);
    }
  }, CHECK_INTERVAL_MS);
}

async function checkAndRunMandatory3DayBackup(now) {
  try {
    let offices = [];
    try {
      offices = await dbAll(`SELECT id FROM offices WHERE status = 'Active'`);
    } catch {
      offices = [{ id: "registrar" }];
    }
    const officeList = (offices && offices.length > 0) ? offices.map(o => o.id) : ["registrar"];

    for (const officeId of officeList) {
      const row = await dbGet(
        `SELECT MAX(created_at) as last_backup_at FROM backups WHERE office_id = ?`,
        [officeId]
      );

      const lastBackupAt = row?.last_backup_at ? new Date(row.last_backup_at).getTime() : 0;
      const isDue = (now.getTime() - lastBackupAt) >= MANDATORY_CADENCE_MS;

      if (isDue) {
        console.log(`[AutoBackup] Mandatory 3-Day backup is due for office "${officeId}". Executing...`);
        try {
          const record = await executeOfficeBackup({
            officeId,
            actorId: null,
          });
          if (record) {
            await dbRun(
              `UPDATE backups SET backup_type = 'Autonomous 3-Day' WHERE id = ?`,
              [record.id]
            );
          }
          await createAuditLog({
            actor: "System Sentinel",
            role: "System",
            action: "Mandatory Backup Policy",
            details: `Autonomous 3-day baseline backup created for office (${officeId}): ${record?.filename || "unknown"}`,
            severity: "INFO",
            entity_type: "Backup",
            entity_id: String(record?.id || ""),
            ip: "127.0.0.1",
          });
          console.log(`[AutoBackup] ✓ Mandatory 3-Day backup completed for "${officeId}": ${record?.filename}`);
        } catch (err) {
          console.error(`[AutoBackup] ✗ Failed executing mandatory 3-Day backup for "${officeId}":`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("[AutoBackup] Error checking mandatory 3-day policy:", err.message);
  }
}

async function checkAndRunScheduledBackups() {
  const now = new Date();

  // 1. Enforce Mandatory 3-Day Autonomous Baseline
  await checkAndRunMandatory3DayBackup(now);

  // 2. Find any custom auto_backup_schedule* keys
  const rows = await dbAll(
    `SELECT key, value FROM settings WHERE key LIKE 'auto_backup_schedule%'`
  );

  if (!rows || rows.length === 0) return;

  for (const row of rows) {
    try {
      const schedule = JSON.parse(row.value);
      if (!schedule || !schedule.enabled) continue;

      const isDue = isBackupDue(schedule, now);
      if (!isDue) continue;

      console.log(`[AutoBackup] Schedule "${row.key}" is due. Executing...`);

      // Determine scope from the key
      const isSystem = row.key === "auto_backup_schedule";
      const officeId = isSystem
        ? null
        : row.key.replace("auto_backup_schedule_", "");

      let record;
      if (isSystem) {
        record = await executeSystemBackup({
          actorId: schedule.createdBy || null,
        });
      } else {
        record = await executeOfficeBackup({
          officeId: officeId || "registrar",
          actorId: schedule.createdBy || null,
        });
      }

      // Update schedule with last run info
      schedule.lastRunAt = now.toISOString();
      schedule.lastRunStatus = "success";
      schedule.lastRunFilename = record?.filename || null;
      delete schedule.lastRunError;

      await dbRun(
        `UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`,
        [JSON.stringify(schedule), row.key]
      );

      // Write audit log
      try {
        const scopeLabel = isSystem
          ? "Platform Governance"
          : `Office (${officeId})`;
        await createAuditLog({
          actor: "System Scheduler",
          role: "System",
          action: "Scheduled Backup (Automatic)",
          details: `Auto-created ${scopeLabel} backup: ${record?.filename || "unknown"}`,
          severity: "INFO",
          entity_type: "Backup",
          entity_id: String(record?.id || ""),
          ip: "127.0.0.1",
        });
      } catch (auditErr) {
        console.error("[AutoBackup] Failed to write audit log:", auditErr.message);
      }

      console.log(
        `[AutoBackup] ✓ Backup completed successfully: ${record?.filename}`
      );
    } catch (err) {
      console.error(
        `[AutoBackup] ✗ Failed executing backup for "${row.key}":`,
        err.message
      );

      // Update schedule with failure status
      try {
        const schedule = JSON.parse(row.value);
        schedule.lastRunAt = now.toISOString();
        schedule.lastRunStatus = "failed";
        schedule.lastRunError = err.message;

        await dbRun(
          `UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`,
          [JSON.stringify(schedule), row.key]
        );
      } catch (updateErr) {
        console.error(
          "[AutoBackup] Failed to record failure status:",
          updateErr.message
        );
      }
    }
  }
}

/**
 * Determines if a backup is due based on the schedule config and current time.
 */
function isBackupDue(schedule, now) {
  const { frequency, time, dayOfWeek, lastRunAt } = schedule;

  // Parse the scheduled time (HH:mm)
  const [schedHour, schedMinute] = (time || "02:00")
    .split(":")
    .map(Number);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Trigger within the scheduled minute window
  const isWithinTimeWindow =
    currentHour === schedHour &&
    Math.abs(currentMinute - schedMinute) <= 1;

  if (!isWithinTimeWindow) return false;

  // Check day-of-week for weekly schedules
  if (frequency === "weekly") {
    const targetDay = dayOfWeek ?? 0; // 0 = Sunday
    if (now.getDay() !== targetDay) return false;
  }

  // De-duplication: don't run again if already ran today (local calendar day)
  if (lastRunAt) {
    const lastRun = new Date(lastRunAt);
    if (now.toDateString() === lastRun.toDateString()) {
      return false;
    }
  }

  return true;
}

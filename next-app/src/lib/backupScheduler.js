import { dbAll, dbRun } from "./postgresCompat.js";
import { executeSystemBackup, executeOfficeBackup, syncBackupExternally } from "./backupsRepo.js";
import { createAuditLog } from "./auditLogsRepo.js";

/**
 * Next.js Instrumentation Hook — Auto Backup Scheduler
 *
 * Runs a background scheduler that checks and executes user-defined
 * automatic backup schedules configured by administrators.
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

  console.log("[AutoBackup] Scheduler initialized for user-defined schedules. Checking every 60s.");

  setInterval(async () => {
    try {
      await checkAndRunScheduledBackups();
    } catch (err) {
      console.error("[AutoBackup] Scheduler tick error:", err.message);
    }
  }, CHECK_INTERVAL_MS);
}

export async function checkAndRunScheduledBackups() {
  if (globalThis.__backupSchedulerRunning) return;
  globalThis.__backupSchedulerRunning = true;
  try {
    await runScheduledBackups();
  } finally {
    globalThis.__backupSchedulerRunning = false;
  }
}

async function runScheduledBackups() {
  const now = new Date();

  // Find any custom auto_backup_schedule* keys configured by administrators
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

      try {
        await syncBackupExternally(record.id);
        schedule.lastRunExternalStatus = "success";
        delete schedule.lastRunExternalError;
      } catch (externalErr) {
        schedule.lastRunExternalStatus = "failed";
        schedule.lastRunExternalError = externalErr.message;
        console.error("[AutoBackup] Local backup saved; external copy failed:", externalErr.message);
      }

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
        delete schedule.lastRunFilename;
        delete schedule.lastRunExternalStatus;
        delete schedule.lastRunExternalError;

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

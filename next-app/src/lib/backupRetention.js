import { listBackups, deleteBackupAndFile } from "./backupsRepo.js";
import { createAuditLog } from "./auditLogsRepo.js";

/**
 * Normalizes a date to UTC midnight for calendar day grouping.
 */
function toMidnightTimestamp(date) {
  const d = new Date(date);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Returns ISO week key (e.g. "2026-W42") for calendar week grouping.
 */
function toWeekKey(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Returns calendar month key (e.g. "2026-10").
 */
function toMonthKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Classifies an array of backup records into GFS retention tiers.
 *
 * Tiers:
 * - 'safety': Pre-restore safety snapshots (always exempt from pruning)
 * - 'manual': Manually generated backups by administrators (always exempt from pruning)
 * - 'daily': Retained under the Daily tier (last N calendar days)
 * - 'weekly': Retained under the Weekly tier (last N calendar weeks)
 * - 'monthly': Retained under the Monthly tier (last N calendar months)
 * - 'expired': Exceeded all retention tiers and eligible for local deletion
 *
 * Safeguards:
 * - Never expires the single most recent backup if only 1 exists in total.
 * - External backup copies remain immutable (handled by deleteBackupAndFile).
 *
 * @param {Array<Object>} backups
 * @param {Object} options
 * @param {Date} [options.now]
 * @param {number} [options.dailyCount=7]
 * @param {number} [options.weeklyCount=4]
 * @param {number} [options.monthlyCount=12]
 * @returns {Array<{ backup: Object, tier: string, retain: boolean, reason: string }>}
 */
export function classifyBackupsGFS(backups = [], options = {}) {
  const {
    now = new Date(),
    dailyCount = 7,
    weeklyCount = 4,
    monthlyCount = 12,
  } = options;

  if (!Array.isArray(backups) || backups.length === 0) {
    return [];
  }

  // Sort backups from newest to oldest
  const sorted = [...backups].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });

  const nowMidnight = toMidnightTimestamp(now);
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Track assigned tiers by backup ID
  const classified = new Map();

  // 1. First Pass: Tag explicitly exempt backups
  const candidates = [];
  for (const backup of sorted) {
    const type = String(backup.backup_type || "").trim().toLowerCase();
    if (type === "pre-restore safety" || type === "safety snapshot") {
      classified.set(backup.id, {
        backup,
        tier: "safety",
        retain: true,
        reason: "Pre-restore safety snapshot is permanently protected",
      });
    } else if (type === "manual") {
      classified.set(backup.id, {
        backup,
        tier: "manual",
        retain: true,
        reason: "Administrator manual backup is permanently protected",
      });
    } else {
      candidates.push(backup);
    }
  }

  if (candidates.length === 0) {
    return sorted.map((b) => classified.get(b.id));
  }

  // 2. Daily Tier: Keep the newest backup for each of the last `dailyCount` calendar days
  const retainedDailyDates = new Set();
  const remainingAfterDaily = [];

  for (const backup of candidates) {
    const backupDate = new Date(backup.created_at || 0);
    const backupMidnight = toMidnightTimestamp(backupDate);
    const dayDiff = Math.floor((nowMidnight - backupMidnight) / oneDayMs);

    // If within the daily window [0, dailyCount - 1]
    if (dayDiff >= 0 && dayDiff < dailyCount) {
      const dateKey = backupDate.toISOString().split("T")[0];
      if (!retainedDailyDates.has(dateKey)) {
        retainedDailyDates.add(dateKey);
        classified.set(backup.id, {
          backup,
          tier: "daily",
          retain: true,
          reason: `Daily recovery point (${dateKey})`,
        });
        continue;
      }
    }
    remainingAfterDaily.push(backup);
  }

  // 3. Weekly Tier: Keep 1 backup per calendar week for the last `weeklyCount` weeks
  const retainedWeeks = new Set();
  const remainingAfterWeekly = [];

  // Determine weekly threshold window: from end of daily window up to weeklyCount weeks prior
  const weeklyCutoffMs = nowMidnight - (dailyCount + weeklyCount * 7) * oneDayMs;

  for (const backup of remainingAfterDaily) {
    const backupDate = new Date(backup.created_at || 0);
    const backupTime = backupDate.getTime();

    if (backupTime >= weeklyCutoffMs && retainedWeeks.size < weeklyCount) {
      const weekKey = toWeekKey(backupDate);
      if (!retainedWeeks.has(weekKey)) {
        retainedWeeks.add(weekKey);
        classified.set(backup.id, {
          backup,
          tier: "weekly",
          retain: true,
          reason: `Weekly recovery point (${weekKey})`,
        });
        continue;
      }
    }
    remainingAfterWeekly.push(backup);
  }

  // 4. Monthly Tier: Keep 1 backup per calendar month for the last `monthlyCount` months
  const retainedMonths = new Set();
  const remainingAfterMonthly = [];

  // Monthly cutoff: roughly monthlyCount * 31 days
  const monthlyCutoffMs = nowMidnight - monthlyCount * 31 * oneDayMs;

  for (const backup of remainingAfterWeekly) {
    const backupDate = new Date(backup.created_at || 0);
    const backupTime = backupDate.getTime();

    if (backupTime >= monthlyCutoffMs && retainedMonths.size < monthlyCount) {
      const monthKey = toMonthKey(backupDate);
      if (!retainedMonths.has(monthKey)) {
        retainedMonths.add(monthKey);
        classified.set(backup.id, {
          backup,
          tier: "monthly",
          retain: true,
          reason: `Monthly recovery point (${monthKey})`,
        });
        continue;
      }
    }
    remainingAfterMonthly.push(backup);
  }

  // 5. Remaining candidates are expired
  for (const backup of remainingAfterMonthly) {
    classified.set(backup.id, {
      backup,
      tier: "expired",
      retain: false,
      reason: "Exceeded GFS 7/4/12 retention schedule",
    });
  }

  // 6. Safeguard: Never leave 0 retained backups
  const anyRetained = Array.from(classified.values()).some((c) => c.retain);
  if (!anyRetained && sorted.length > 0) {
    const newest = sorted[0];
    classified.set(newest.id, {
      backup: newest,
      tier: "daily",
      retain: true,
      reason: "Protected as the sole remaining recovery point",
    });
  }

  return sorted.map((b) => classified.get(b.id));
}

/**
 * Evaluates and applies GFS retention to local backups for a given scope and office.
 * Automatically deletes expired local files and records an audit log.
 *
 * @param {Object} options
 * @param {string} [options.scope='office'] 'office' or 'system'
 * @param {string|null} [options.officeId=null] e.g. 'registrar' or 'osas'
 * @param {Object} [options.retentionConfig]
 * @param {string|null} [options.actorId]
 * @returns {Promise<{
 *   evaluatedCount: number,
 *   retainedCount: number,
 *   prunedCount: number,
 *   prunedFilenames: string[],
 *   tiers: Object
 * }>}
 */
export async function applyGfsRetention({
  scope = "office",
  officeId = null,
  retentionConfig = {},
  actorId = "System Scheduler",
} = {}) {
  const {
    enabled = true,
    daily = 7,
    weekly = 4,
    monthly = 12,
  } = retentionConfig;

  if (!enabled) {
    return {
      evaluatedCount: 0,
      retainedCount: 0,
      prunedCount: 0,
      prunedFilenames: [],
      tiers: {},
    };
  }

  const backups = await listBackups({ scope, officeId });
  if (!backups || backups.length === 0) {
    return {
      evaluatedCount: 0,
      retainedCount: 0,
      prunedCount: 0,
      prunedFilenames: [],
      tiers: {},
    };
  }

  const classified = classifyBackupsGFS(backups, {
    dailyCount: daily,
    weeklyCount: weekly,
    monthlyCount: monthly,
  });

  const expiredEntries = classified.filter((c) => !c.retain);
  const prunedFilenames = [];
  const tierCounts = {
    daily: 0,
    weekly: 0,
    monthly: 0,
    manual: 0,
    safety: 0,
    expired: 0,
  };

  for (const entry of classified) {
    tierCounts[entry.tier] = (tierCounts[entry.tier] || 0) + 1;
  }

  for (const { backup } of expiredEntries) {
    try {
      const res = await deleteBackupAndFile(backup.id, backup);
      if (res?.deleted) {
        prunedFilenames.push(backup.filename);
      }
    } catch (err) {
      console.error(`[GFS Retention] Failed to delete expired backup ${backup.filename}:`, err.message);
    }
  }

  if (prunedFilenames.length > 0) {
    const scopeLabel = scope === "system" ? "Platform Governance" : `Office (${officeId || "general"})`;
    try {
      await createAuditLog({
        actor: actorId || "System Scheduler",
        role: "System",
        action: "Automated Backup Retention (GFS)",
        details: `Cleaned up ${prunedFilenames.length} expired local backup(s) for ${scopeLabel} under GFS 7/4/12 retention: ${prunedFilenames.join(", ")}`,
        severity: "INFO",
        entity_type: "Backup",
        entity_id: String(expiredEntries[0]?.backup?.id || ""),
        ip: "127.0.0.1",
      });
    } catch (auditErr) {
      console.error("[GFS Retention] Failed to record retention audit log:", auditErr.message);
    }
  }

  return {
    evaluatedCount: backups.length,
    retainedCount: backups.length - prunedFilenames.length,
    prunedCount: prunedFilenames.length,
    prunedFilenames,
    tiers: tierCounts,
  };
}

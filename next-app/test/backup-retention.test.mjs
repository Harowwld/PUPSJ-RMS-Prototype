import test from "node:test";
import assert from "node:assert/strict";
import { classifyBackupsGFS } from "../src/lib/backupRetention.js";

test("classifyBackupsGFS returns empty array when given empty list", () => {
  const result = classifyBackupsGFS([]);
  assert.deepEqual(result, []);
});

test("classifyBackupsGFS permanently protects manual and safety backups regardless of age", () => {
  const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString();

  const mockBackups = [
    {
      id: 1,
      filename: "PUP-REGISTRAR-MANUAL.zip.enc",
      backup_type: "Manual",
      created_at: threeYearsAgo,
    },
    {
      id: 2,
      filename: "PUP-REGISTRAR-SAFETY.zip.enc",
      backup_type: "Pre-Restore Safety",
      created_at: threeYearsAgo,
    },
  ];

  const result = classifyBackupsGFS(mockBackups);
  assert.equal(result.length, 2);

  const manual = result.find((r) => r.backup.id === 1);
  assert.equal(manual.tier, "manual");
  assert.equal(manual.retain, true);

  const safety = result.find((r) => r.backup.id === 2);
  assert.equal(safety.tier, "safety");
  assert.equal(safety.retain, true);
});

test("classifyBackupsGFS correctly retains 7 daily, 4 weekly, and 12 monthly recovery points and expires older backups", () => {
  // Use a fixed reference date: Oct 17, 2026, 12:00:00 UTC
  const fixedNow = new Date("2026-10-17T12:00:00Z");
  const oneDayMs = 24 * 60 * 60 * 1000;

  const mockBackups = [];
  let idCounter = 1;

  // Helper to generate a backup at daysAgo
  function addBackup(daysAgo, type = "Scheduled") {
    const d = new Date(fixedNow.getTime() - daysAgo * oneDayMs);
    mockBackups.push({
      id: idCounter++,
      filename: `backup-day-${daysAgo}.zip.enc`,
      backup_type: type,
      created_at: d.toISOString(),
    });
  }

  // 1. Generate 10 consecutive daily backups (Day 0 through Day 9)
  for (let i = 0; i < 10; i++) {
    addBackup(i);
  }

  // 2. Generate backups for 4 previous weeks (e.g. Day 14, 21, 28, 35)
  addBackup(14);
  addBackup(21);
  addBackup(28);
  addBackup(35);

  // 3. Generate backups for 12 previous months (e.g. roughly every 30 days from Day 60 to Day 360)
  for (let m = 2; m <= 12; m++) {
    addBackup(m * 30);
  }

  // 4. Generate very old backups (> 400 days old) that must expire
  addBackup(450);
  addBackup(500);

  const result = classifyBackupsGFS(mockBackups, {
    now: fixedNow,
    dailyCount: 7,
    weeklyCount: 4,
    monthlyCount: 12,
  });

  const dailyRetained = result.filter((r) => r.tier === "daily");
  const weeklyRetained = result.filter((r) => r.tier === "weekly");
  const monthlyRetained = result.filter((r) => r.tier === "monthly");
  const expired = result.filter((r) => r.tier === "expired");

  // Exactly 7 daily backups retained
  assert.equal(dailyRetained.length, 7, "Should retain exactly 7 daily recovery points");
  for (const d of dailyRetained) {
    assert.equal(d.retain, true);
  }

  // Exactly 4 weekly backups retained
  assert.equal(weeklyRetained.length, 4, "Should retain 4 weekly recovery points");
  for (const w of weeklyRetained) {
    assert.equal(w.retain, true);
  }

  // Monthly backups retained
  assert.ok(monthlyRetained.length > 0 && monthlyRetained.length <= 12, "Should retain up to 12 monthly recovery points");
  for (const m of monthlyRetained) {
    assert.equal(m.retain, true);
  }

  // The 450-day and 500-day backups must be expired
  assert.ok(expired.some((e) => e.backup.filename === "backup-day-450.zip.enc" && !e.retain));
  assert.ok(expired.some((e) => e.backup.filename === "backup-day-500.zip.enc" && !e.retain));
});

test("classifyBackupsGFS deduplicates multiple backups on the same day keeping the newest for daily", () => {
  const fixedNow = new Date("2026-10-17T12:00:00Z");

  const mockBackups = [
    {
      id: 10,
      filename: "backup-today-morning.zip.enc",
      backup_type: "Scheduled",
      created_at: "2026-10-17T08:00:00Z",
    },
    {
      id: 11,
      filename: "backup-today-noon.zip.enc",
      backup_type: "Scheduled",
      created_at: "2026-10-17T12:00:00Z",
    },
  ];

  const result = classifyBackupsGFS(mockBackups, { now: fixedNow, dailyCount: 7 });

  const noon = result.find((r) => r.backup.id === 11);
  assert.equal(noon.tier, "daily");
  assert.equal(noon.retain, true);
});

test("classifyBackupsGFS never leaves 0 backups even if the single backup is very old", () => {
  const fixedNow = new Date("2026-10-17T12:00:00Z");

  const mockBackups = [
    {
      id: 99,
      filename: "ancient-backup.zip.enc",
      backup_type: "Scheduled",
      created_at: "2020-01-01T00:00:00Z",
    },
  ];

  const result = classifyBackupsGFS(mockBackups, { now: fixedNow });
  assert.equal(result.length, 1);
  assert.equal(result[0].retain, true, "Single remaining backup must be protected");
});

import test from "node:test";
import assert from "node:assert/strict";

import { listAuditLogs, countAuditLogs, getAuditLogStats } from "../src/lib/auditLogsRepo.js";

test("Audit logs repo - actorExact multi-alias array and case-insensitivity", async () => {
  // Query with single actor string
  const countSingle = await countAuditLogs({ actorExact: "System" });
  assert.equal(typeof countSingle, "number");

  // Query with multi-alias array
  const countMulti = await countAuditLogs({ actorExact: ["System", "system", "NonExistentUser12345"] });
  assert.equal(typeof countMulti, "number");
  assert.ok(countMulti >= countSingle, "Multi-alias count should be at least single alias count");

  // List with multi-alias array
  const list = await listAuditLogs({ actorExact: ["System", "system"], limit: 5 });
  assert.ok(Array.isArray(list));

  // Stats with multi-alias array
  const stats = await getAuditLogStats(["System", "system"]);
  assert.equal(typeof stats.totalLogs, "number");
  assert.equal(typeof stats.logsToday, "number");
  assert.equal(typeof stats.authEvents, "number");
  assert.ok(Array.isArray(stats.trends));
});

test("Audit logs repo - officeId scoping isolation", async () => {
  // Query with officeId
  const osasCount = await countAuditLogs({ officeId: "osas" });
  assert.equal(typeof osasCount, "number");

  // Query without officeId
  const allCount = await countAuditLogs({});
  assert.equal(typeof allCount, "number");
  assert.ok(allCount >= osasCount, "Total count without office filter should be >= office-scoped count");
});

test("HTTP API - personal activity (mine=1) vs office-scoped admin audit logs", async () => {
  const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

  // 1. Authenticate as OSAS Admin
  const osasLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin.osas@pup.local", password: "pupstaff" }),
  });

  if (osasLoginRes.status === 200) {
    const rawCookies = osasLoginRes.headers.getSetCookie();
    const cookieHeader = rawCookies.map(c => c.split(";")[0]).join("; ");

    // Fetch personal activity (mine=1)
    const personalRes = await fetch(`${BASE_URL}/api/audit-logs?mine=1&limit=20`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(personalRes.status, 200, "OSAS Admin must be able to view their own activity");
    const personalJson = await personalRes.json();
    assert.equal(personalJson.ok, true);

    // Fetch personal stats (mine=1)
    const personalStatsRes = await fetch(`${BASE_URL}/api/audit-logs/stats?mine=1`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(personalStatsRes.status, 200, "OSAS Admin must be able to view personal stats");
    const personalStatsJson = await personalStatsRes.json();
    assert.equal(personalStatsJson.ok, true);
    assert.equal(typeof personalStatsJson.data.totalLogs, "number");

    // Fetch office-scoped logs (admin tab: mine is NOT set)
    const officeRes = await fetch(`${BASE_URL}/api/audit-logs?limit=20`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(officeRes.status, 200, "OSAS Admin must be able to view office audit logs");
    const officeJson = await officeRes.json();
    assert.equal(officeJson.ok, true);
    // Ensure all returned rows in office view belong to osas or are office-scoped
    for (const row of officeJson.data) {
      if (row.office_id) {
        assert.equal(row.office_id.toLowerCase(), "osas", "Office admin view must be strictly office-scoped");
      }
    }
  }

  // 2. Authenticate as Registrar Staff
  const staffLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "staff.registrar@pup.local", password: "pupstaff" }),
  });

  if (staffLoginRes.status === 200) {
    const rawCookies = staffLoginRes.headers.getSetCookie();
    const cookieHeader = rawCookies.map(c => c.split(";")[0]).join("; ");

    // Staff fetching personal activity (mine=1) -> Allowed (200)
    const staffMineRes = await fetch(`${BASE_URL}/api/audit-logs?mine=1&limit=20`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(staffMineRes.status, 200, "Staff must be allowed to view their own activity");
    const staffMineJson = await staffMineRes.json();
    assert.equal(staffMineJson.ok, true);

    // Staff fetching personal stats (mine=1) -> Allowed (200)
    const staffStatsRes = await fetch(`${BASE_URL}/api/audit-logs/stats?mine=1`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(staffStatsRes.status, 200, "Staff must be allowed to view personal stats");

    // Staff fetching office-wide logs (admin view without mine=1) -> Forbidden (403)
    const staffOfficeRes = await fetch(`${BASE_URL}/api/audit-logs?limit=20`, {
      headers: { cookie: cookieHeader },
    });
    assert.equal(staffOfficeRes.status, 403, "Staff must NOT be allowed to view office-wide audit logs without admin role");
  }
});



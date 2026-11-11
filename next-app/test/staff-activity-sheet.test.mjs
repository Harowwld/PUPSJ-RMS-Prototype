import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..");

test("Personnel Activity History - API Route and Repository Architecture", () => {
  const apiPath = path.join(ROOT_DIR, "src/app/api/staff/[id]/activity/route.js");
  assert.ok(fs.existsSync(apiPath), "src/app/api/staff/[id]/activity/route.js must exist");

  const apiCode = fs.readFileSync(apiPath, "utf8");
  assert.ok(apiCode.includes("export async function GET"), "API route must export GET handler");
  assert.ok(apiCode.includes("listStaffActivityLogs"), "API route must invoke listStaffActivityLogs");
  assert.ok(apiCode.includes("countStaffActivityLogs"), "API route must invoke countStaffActivityLogs");
  assert.ok(apiCode.includes("decryptPII"), "API route must decrypt PII on actors and details");
  assert.ok(apiCode.includes("formatLogDetails"), "API route must format log details");
  assert.ok(apiCode.includes("eventType"), "API route must classify events into operator vs target");

  const repoPath = path.join(ROOT_DIR, "src/lib/auditLogsRepo.js");
  const repoCode = fs.readFileSync(repoPath, "utf8");
  assert.ok(repoCode.includes("export async function listStaffActivityLogs"), "auditLogsRepo must export listStaffActivityLogs");
  assert.ok(repoCode.includes("export async function countStaffActivityLogs"), "auditLogsRepo must export countStaffActivityLogs");
  assert.ok(repoCode.includes("applyStaffActivityWhereClauses"), "auditLogsRepo must include staff activity query builder");
});

test("Personnel Activity History - In-Sheet Stream Component Standards", () => {
  const compPath = path.join(ROOT_DIR, "src/components/systemadmin/PersonnelActivityStream.js");
  assert.ok(fs.existsSync(compPath), "PersonnelActivityStream.js must exist");

  const compCode = fs.readFileSync(compPath, "utf8");
  assert.ok(compCode.includes("export default function PersonnelActivityStream"), "Must export PersonnelActivityStream component");
  assert.ok(compCode.includes("RefreshButton"), "Must feature RefreshButton for on-demand sync");
  assert.ok(compCode.includes("EmptyState"), "Must feature standardized EmptyState");
  assert.ok(compCode.includes("formatNotificationTimeAgo"), "Must format relative time with formatNotificationTimeAgo");
  assert.ok(compCode.includes("formatPHDateTime"), "Must format canonical time with formatPHDateTime");
  assert.ok(compCode.includes("tabular-nums"), "Must format numbers and dates with tabular-nums");
  assert.ok(compCode.includes("BADGE_PALETTES"), "Must use standardized badge palettes");
  assert.ok(compCode.includes("Load More"), "Must support load-more pagination");
});

test("Personnel Activity History - GlobalStaffTab Slide-Over Integration", () => {
  const tabPath = path.join(ROOT_DIR, "src/components/systemadmin/GlobalStaffTab.js");
  assert.ok(fs.existsSync(tabPath), "GlobalStaffTab.js must exist");

  const code = fs.readFileSync(tabPath, "utf8");

  // Tab state and navigation
  assert.ok(code.includes('sheetTab'), "Must feature sheetTab state");
  assert.ok(code.includes('SegmentedControl'), "Must render SegmentedControl in slide-over sheet");
  assert.ok(code.includes('value: "profile"') && code.includes('label: "Profile Overview"'), "Must feature Profile Overview tab");
  assert.ok(code.includes('value: "activity"') && code.includes('label: "Activity History"'), "Must feature Activity History tab with badge");
  assert.ok(code.includes('inspectActivitySummary'), "Must maintain inspectActivitySummary state");

  // In-sheet stream rendering
  assert.ok(code.includes("<PersonnelActivityStream"), "Must render PersonnelActivityStream when activity tab is active");

  // Recent activity teaser on profile overview
  assert.ok(code.includes("Recent Activity History"), "Profile tab must include Recent Activity History card");
  assert.ok(code.includes('onClick={() => setSheetTab("activity")}'), "Teaser must feature inline button to switch tabs without leaving sheet");

  // Zero regressions on Sheet standards
  assert.ok(code.includes("Personnel Details"), "Must maintain clean SheetTitle");
  assert.ok(code.includes("<SheetHeader"), "Must contain SheetHeader");
  assert.ok(code.includes("<SheetFooter"), "Must contain SheetFooter");
  assert.ok(code.includes('variant="outline"'), "Buttons must maintain outline variant");
});

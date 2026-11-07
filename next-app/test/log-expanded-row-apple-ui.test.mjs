import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const LOG_EXPANDED_ROW_PATH = path.resolve("src/components/admin/audit-logs/LogExpandedRow.js");

test("LogExpandedRow adheres to Apple UI Inset Grouped design tokens", () => {
  const code = fs.readFileSync(LOG_EXPANDED_ROW_PATH, "utf8");

  // Inset backdrop & elevation
  assert.ok(code.includes("backdrop-blur-md"), "Must use translucent backdrop blur");
  assert.ok(code.includes("shadow-[inset_0_2px_4px"), "Must use Apple inset shadow for sunken table detail");

  // 3-Card Apple Inset Grouped Grid
  assert.ok(code.includes("rounded-2xl"), "Cards must use rounded-2xl squircle border radius");
  assert.ok(code.includes("grid-cols-1 md:grid-cols-2 lg:grid-cols-3"), "Must lay out 3 responsive cards");
  assert.ok(code.includes("divide-y"), "Must use Apple hairline divided rows");

  // Dotless semantic badges
  assert.ok(!code.includes("dotClass"), "Badges must not contain dot indicator classes");
  assert.ok(!code.includes("<span className=\"size-1.5 rounded-full"), "Badges must be dotless");

  // Zero raw hex inline style anti-patterns
  assert.ok(!code.includes("#FAFAFA"), "Must not use hardcoded #FAFAFA");
  assert.ok(!code.includes("#121214"), "Must not use hardcoded #121214");
  assert.ok(!code.includes("#8E8E93"), "Must not use hardcoded #8E8E93");
  assert.ok(!code.includes("#E0F2FE"), "Must not use hardcoded #E0F2FE");
  assert.ok(!code.includes("style={{ borderTop"), "Must not use inline border style");

  // User Agent intelligent parsing & raw copy
  assert.ok(code.includes("parseUserAgent"), "Must include intelligent User Agent parsing");
  assert.ok(code.includes("Client Platform"), "Must display parsed Client Platform");
  assert.ok(code.includes("aria-label=\"Copy raw User Agent\""), "Must provide tactile action to copy raw User Agent");

  // Button rules: no icon in labeled button; no label in icon button
  assert.ok(!code.includes("<Copy01Icon") || !code.includes("Copy Record (JSON)</span>"), "Copy Record (JSON) button must not contain icons");
  assert.ok(code.includes('{copiedKey === "json" ? "Record Data Copied!" : "Copy Record (JSON)"}'), "Action button must be strictly text-only");

  // Apple tactile interactions
  assert.ok(code.includes("active:scale-95"), "Buttons must have Apple active:scale-95 tactile press feedback");
  assert.ok(code.includes("tabular-nums"), "Digits, IDs, and timestamps must use tabular-nums");

  // Full Record JSON Quick Action
  assert.ok(code.includes("Copy Record (JSON)"), "Must provide JSON compliance record copy");
});

test("GlobalAuditLogsTab and LogTable provide expand/collapse all rows in table header", () => {
  const globalLogsCode = fs.readFileSync(path.resolve("src/components/systemadmin/GlobalAuditLogsTab.js"), "utf8");
  const logTableCode = fs.readFileSync(path.resolve("src/components/admin/audit-logs/LogTable.js"), "utf8");

  // GlobalAuditLogsTab check
  assert.ok(globalLogsCode.includes("toggleExpandAll"), "GlobalAuditLogsTab must provide toggleExpandAll handler");
  assert.ok(globalLogsCode.includes("allExpanded"), "GlobalAuditLogsTab must track allExpanded state");
  assert.ok(globalLogsCode.includes("aria-label={allExpanded ? \"Collapse all rows\" : \"Expand all rows\"}"), "GlobalAuditLogsTab must have accessible expand/collapse all header button");

  // LogTable check
  assert.ok(logTableCode.includes("toggleExpandAll"), "LogTable must provide toggleExpandAll handler");
  assert.ok(logTableCode.includes("allExpanded"), "LogTable must track allExpanded state");
  assert.ok(logTableCode.includes('aria-label={allExpanded ? "Collapse all rows" : "Expand all rows"}'), "LogTable must have accessible expand/collapse all header button");
});

test("Audit log skeleton centers action column and sheet renders standard avatar fallback without ID doubling", () => {
  const skeletonCode = fs.readFileSync(path.resolve("src/components/systemadmin/skeletons/AuditLogsTableSkeleton.js"), "utf8");
  const sheetCode = fs.readFileSync(path.resolve("src/components/admin/audit-logs/LogDetailSheet.js"), "utf8");
  const globalLogsCode = fs.readFileSync(path.resolve("src/components/systemadmin/GlobalAuditLogsTab.js"), "utf8");

  // Skeleton action column must be centered, matching real table w-12 cell
  assert.ok(skeletonCode.includes('<th className="w-12 min-w-12 max-w-12 px-2 text-center">'), "Skeleton action th must be centered in w-12");
  assert.ok(skeletonCode.includes('<td className="w-12 min-w-12 max-w-12 px-2 align-middle text-center whitespace-nowrap">'), "Skeleton action td must be centered in w-12");
  assert.ok(!skeletonCode.includes("pr-6 text-right w-20"), "Skeleton must not use off-center pr-6 text-right");

  // LogDetailSheet must use clean avatar fallback without overriding Apple gradient
  assert.ok(!sheetCode.includes("bg-red-50 text-pup-maroon"), "Sheet must not force pale red background on avatar fallback");
  assert.ok(sheetCode.includes('fallbackClassName="font-bold text-sm"'), "Sheet must use clean fallback typography for avatar initials");
  assert.ok(sheetCode.includes("selectedLog.user || selectedLog.actor"), "Sheet must resolve actor attribute gracefully");

  // ID formatting must not double 'global' prefix
  assert.ok(!globalLogsCode.includes('${r.log_source || "global"}-${r.office_id || "global"}-${r.id}'), "Global logs must not double 'global' prefix");
  assert.ok(globalLogsCode.includes('const prefix = r.office_id ? `global-${r.office_id}` : "global"'), "Global logs must construct clean prefix");
});

test("LogExpandedRow badges strictly use standardized rounded-full border radius", () => {
  const code = fs.readFileSync(LOG_EXPANDED_ROW_PATH, "utf8");

  // All pill badges in the cards must use standard rounded-full
  assert.ok(code.includes("px-2.5 py-0.5 rounded-full"), "Severity, action, network, and scope badges must use rounded-full");
  assert.ok(code.includes("rounded-full bg-gray-100/80"), "Contextual metadata badges must use rounded-full");
  assert.ok(code.includes("rounded-full text-[11px] font-semibold bg-sky-50"), "Entity type badge must use rounded-full");

  // Must not contain non-standard rounded-md or rounded-lg on badges
  assert.ok(!code.includes("rounded-md text-[11px]"), "Badges must not use non-standard rounded-md");
  assert.ok(!code.includes("rounded-lg text-[11px]"), "Badges must not use non-standard rounded-lg");
});

test("Default table density for audit activity history is configured to 50 rows per page", () => {
  const globalLogsCode = fs.readFileSync(path.resolve("src/components/systemadmin/GlobalAuditLogsTab.js"), "utf8");
  const adminPageCode = fs.readFileSync(path.resolve("src/app/admin/page.js"), "utf8");
  const auditLogsTabCode = fs.readFileSync(path.resolve("src/components/admin/AuditLogsTab.js"), "utf8");
  const logPaginationCode = fs.readFileSync(path.resolve("src/components/admin/audit-logs/LogPagination.js"), "utf8");
  const skeletonCode = fs.readFileSync(path.resolve("src/components/systemadmin/skeletons/GlobalAuditLogsSkeleton.js"), "utf8");

  // GlobalAuditLogsTab limit default
  assert.ok(globalLogsCode.includes('useViewPreference("logs", "limit", 50)'), "GlobalAuditLogsTab must default limit to 50");

  // Admin page logsPerPage default
  assert.ok(adminPageCode.includes("const [logsPerPage, setLogsPerPage] = useState(50)"), "Admin page must default logsPerPage to 50");

  // AuditLogsTab fallback
  assert.ok(auditLogsTabCode.includes("useState(logsPerPage || 50)"), "AuditLogsTab must default itemsPerPage to 50");

  // LogPagination fallback
  assert.ok(logPaginationCode.includes("pageSize={itemsPerPage || logsPerPage || 50}"), "LogPagination must fallback pageSize to 50");

  // GlobalAuditLogsSkeleton rowCount
  assert.ok(skeletonCode.includes("<AuditLogsTableSkeleton rowCount={50} embedded showScope />"), "GlobalAuditLogsSkeleton must display 50 skeleton rows");
});

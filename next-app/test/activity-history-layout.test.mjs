import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUDIT_TAB_PATH = path.resolve(
  __dirname,
  "../src/components/admin/AuditLogsTab.js"
);
const AUDIT_STAT_CARDS_PATH = path.resolve(
  __dirname,
  "../src/components/admin/audit-logs/StatCards.js"
);
const AUDIT_FILTERS_PATH = path.resolve(
  __dirname,
  "../src/components/admin/audit-logs/LogFilters.js"
);
const AUDIT_TABLE_PATH = path.resolve(
  __dirname,
  "../src/components/admin/audit-logs/LogTable.js"
);
const GLOBAL_AUDIT_TAB_PATH = path.resolve(
  __dirname,
  "../src/components/systemadmin/GlobalAuditLogsTab.js"
);
const GLOBAL_AUDIT_SKELETON_PATH = path.resolve(
  __dirname,
  "../src/components/systemadmin/skeletons/GlobalAuditLogsSkeleton.js"
);

test("Activity History layout, toolbar, and stat cards design standards", () => {
  const tabCode = fs.readFileSync(AUDIT_TAB_PATH, "utf8");
  const statCardsCode = fs.readFileSync(AUDIT_STAT_CARDS_PATH, "utf8");
  const filtersCode = fs.readFileSync(AUDIT_FILTERS_PATH, "utf8");
  const tableCode = fs.readFileSync(AUDIT_TABLE_PATH, "utf8");
  const globalTabCode = fs.readFileSync(GLOBAL_AUDIT_TAB_PATH, "utf8");
  const globalSkeletonCode = fs.readFileSync(GLOBAL_AUDIT_SKELETON_PATH, "utf8");

  // 1. Single unified outer Card container
  assert.ok(
    tabCode.includes("overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card"),
    "Activity History tab must wrap all dashboard sections in a continuous rounded-2xl Card"
  );

  // 2. PageHeader with inline metric summary and standard action buttons
  assert.ok(
    tabCode.includes("<PageHeader"),
    "PageHeader must be rendered"
  );
  assert.ok(
    tabCode.includes("total events"),
    "PageHeader title must contain inline metric summary with total events"
  );
  assert.ok(
    tabCode.includes("<RefreshButton") && tabCode.includes('className="h-9 w-9"'),
    "RefreshButton must be present in PageHeader actions with h-9 w-9 sizing"
  );
  assert.ok(
    tabCode.includes("Export CSV") && tabCode.includes("PDF_ACTION_LABELS.preview"),
    "Actions must include Export CSV and Preview PDF directly"
  );
  assert.ok(
    !tabCode.includes("secondaryActions="),
    "PageHeader must not hide Export CSV behind secondaryActions popover"
  );

  // 3. Elevated Container for Stat Cards
  assert.ok(
    tabCode.includes("rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]"),
    "Stat cards in AuditLogsTab must be enclosed in the canonical elevated container"
  );

  // 4. Steady, non-interactive Records Review style Stat Cards in StatCards.js
  assert.ok(
    !statCardsCode.includes("Reorder.Group") && !statCardsCode.includes("Reorder.Item"),
    "Draggable Reorder behavior must be removed from StatCards"
  );
  assert.ok(
    !statCardsCode.includes("selectedKpi"),
    "Redundant click dropdown card must be removed from StatCards"
  );
  assert.ok(
    !statCardsCode.includes("DragDropIcon"),
    "DragDropIcon must be removed from StatCards"
  );
  assert.ok(
    statCardsCode.includes("Total Events") &&
      statCardsCode.includes("Activity Today") &&
      statCardsCode.includes("Auth Attempts"),
    "Must preserve the 3 core metric cards"
  );

  // 5. DataViewToolbar in LogFilters with canonical FilterPopover, SortPopover, ColumnsPopover, DateRangeFilterButton
  assert.ok(
    filtersCode.includes("<DataViewToolbar"),
    "LogFilters must use canonical DataViewToolbar"
  );
  assert.ok(
    filtersCode.includes("<DashboardSearch"),
    "LogFilters must use DashboardSearch"
  );
  assert.ok(
    filtersCode.includes("<FilterPopover"),
    "LogFilters must integrate canonical FilterPopover"
  );
  assert.ok(
    filtersCode.includes("<SortPopover"),
    "LogFilters must integrate canonical SortPopover"
  );
  assert.ok(
    filtersCode.includes("<ColumnsPopover"),
    "LogFilters must integrate canonical ColumnsPopover"
  );
  assert.ok(
    filtersCode.includes("<DateRangeFilterButton"),
    "LogFilters must integrate canonical DateRangeFilterButton"
  );
  assert.ok(
    filtersCode.includes("<TableScrollControls"),
    "LogFilters must place TableScrollControls on the left alongside DashboardSearch"
  );

  // 6. ActiveFilterChips in AuditLogsTab
  assert.ok(
    tabCode.includes("<ActiveFilterChips"),
    "AuditLogsTab must render ActiveFilterChips for active filter rules, search, and dates"
  );

  // 7. Modern EmptyState in LogTable and removal of redundant "Showing ... events" inner toolbar
  assert.ok(
    tableCode.includes("<EmptyState"),
    "LogTable must use modern EmptyState"
  );
  assert.ok(
    !tableCode.includes("<EmptyHeader>"),
    "LogTable must not use legacy EmptyHeader"
  );
  assert.ok(
    !tableCode.includes("Showing ") && !tableCode.includes("events"),
    "LogTable must remove the redundant 'Showing ... of ... events' line"
  );
  assert.ok(
    !tableCode.includes('label="Audit log table controls"'),
    "LogTable must remove the redundant inner DataViewToolbar"
  );

  // 8. Generous space for Description without restrictive max-width clamping
  assert.ok(
    !tableCode.includes("max-w-[280px]") && !tableCode.includes("max-w-[260px]"),
    "LogTable must not clamp description header or cells to narrow 260px/280px width"
  );
  assert.ok(
    tableCode.includes("showColumn"),
    "LogTable must support configurable visible columns via showColumn"
  );

  // 9. Scope column removed from office-scoped activity history
  assert.ok(
    !filtersCode.includes('"office_id"') && !filtersCode.includes('"Scope"'),
    "LogFilters must omit Scope (office_id) because logs are already office-scoped to Registrar/OSAS"
  );
  assert.ok(
    !filtersCode.includes('key: "office"'),
    "LogFilters must not include office in AUDIT_FILTER_FIELDS for office activity history"
  );
  assert.ok(
    !tableCode.includes('showColumn("office_id")'),
    "LogTable must omit Scope column from headers and cells"
  );

  // 10. Severity tabs (SegmentedControl) in AuditLogsTab
  assert.ok(
    tabCode.includes("<SegmentedControl") && tabCode.includes('aria-label="Activity severity"'),
    "AuditLogsTab must render Severity tabs with SegmentedControl"
  );
  assert.ok(
    tabCode.includes('"All Levels"') &&
      tabCode.includes('"Information"') &&
      tabCode.includes('"Warning"') &&
      tabCode.includes('"Critical"'),
    "AuditLogsTab Severity tabs must include All Levels, Information, Warning, and Critical"
  );

  // 11. Stat cards in GlobalAuditLogsTab and GlobalAuditLogsSkeleton
  assert.ok(
    globalTabCode.includes("<StatCards") &&
      globalTabCode.includes("rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]"),
    "GlobalAuditLogsTab must render StatCards in the elevated container"
  );
  assert.ok(
    globalTabCode.includes("/api/audit-logs/global/stats"),
    "GlobalAuditLogsTab must fetch stat card metrics from /api/audit-logs/global/stats"
  );
  assert.ok(
    globalSkeletonCode.includes("<KpiStatCardsSkeleton") &&
      globalSkeletonCode.includes("rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]"),
    "GlobalAuditLogsSkeleton must render KpiStatCardsSkeleton in the elevated container"
  );

  // 12. Active filter chips must NOT be activated by severity tabs
  assert.ok(
    !tabCode.includes("logSeverityFilter !== \"All\") ||") &&
      tabCode.includes('filterRules.filter((r) => r.fieldKey !== "severity")'),
    "AuditLogsTab must not activate the active filter chips line when using severity tabs"
  );
  assert.ok(
    !globalTabCode.includes("logFilters.severity?.length > 0") &&
      globalTabCode.includes('filterRules.filter((r) => r.fieldKey !== "severity")'),
    "GlobalAuditLogsTab must not activate the active filter chips line when using severity tabs"
  );
});

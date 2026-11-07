import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const OSAS_TAB_PATH = path.resolve(process.cwd(), "src/components/staff/OsasMonitoringTab.js");
const OSAS_RECORD_LIST_PATH = path.resolve(process.cwd(), "src/components/staff/osas/OsasRecordList.js");

test("OSAS Monitoring multi-view architecture and toolbar design standard", () => {
  const osasCode = fs.readFileSync(OSAS_TAB_PATH, "utf8");

  // 1. PageHeader inline metric summary and standard RefreshButton
  assert.ok(
    osasCode.includes("activeFilteredList.length.toLocaleString()"),
    "PageHeader must render an inline count summary of filtered records"
  );
  assert.ok(
    osasCode.includes("isLoading={isRefreshing}"),
    "RefreshButton must bind to isRefreshing to prevent layout tearing skeletons"
  );

  // 2. Connected Segmented Tabs Row with equal-width capsule controls
  assert.ok(
    osasCode.includes('aria-label="OSAS submissions stream and view mode"'),
    "Must include connected segmented tabs row with accessible aria-label"
  );
  assert.ok(
    osasCode.includes("Pre-Event Proposals") && osasCode.includes("Post-Event & Liquidation"),
    "Stream tabs must include Pre-Event Proposals and Post-Event & Liquidation"
  );
  assert.ok(
    osasCode.includes('auto-cols-fr shrink-0'),
    "Segmented controls must use auto-cols-fr for equal width tabs"
  );

  // 3. 3-Way View Mode Switcher
  assert.ok(
    osasCode.includes('value: "list"') &&
    osasCode.includes('value: "table"') &&
    osasCode.includes('value: "kanban"'),
    "Must offer 3 distinct visualization modes: List, Table, and Kanban"
  );

  // 4. DataViewToolbar with DashboardSearch and OfficeTableControls
  assert.ok(
    osasCode.includes("<DashboardSearch"),
    "DataViewToolbar must use the standardized DashboardSearch component"
  );
  assert.ok(
    osasCode.includes("<FilterPopover") &&
    osasCode.includes("<SortPopover") &&
    osasCode.includes("<GroupPopover") &&
    osasCode.includes("<ColumnsPopover"),
    "DataViewToolbar must reuse OfficeTableControls (FilterPopover, SortPopover, GroupPopover, ColumnsPopover)"
  );
  assert.ok(
    osasCode.includes("<TableScrollControls"),
    "TableScrollControls must be rendered on the left group when in table view"
  );

  // 5. ActiveFilterChips conditional mounting
  assert.ok(
    osasCode.includes("activeChips.length > 0 &&"),
    "ActiveFilterChips row must be conditionally rendered only when activeChips exist"
  );

  // 6. Anti-Flicker: Lazy useState initialization
  assert.ok(
    osasCode.includes('const [viewMode, setViewMode] = useState(() =>'),
    "viewMode must be lazily initialized in useState to prevent first-paint flickering"
  );

  // 7. Strictly Text-Only Status Badges in Table Rows (No indicator dots)
  // Check that inside table body rows, there are no <span className="...w-1.5 h-1.5 rounded-full..." />
  const tableRowsSnippet = osasCode.substring(
    osasCode.indexOf("paginatedRows.map"),
    osasCode.indexOf("/* STREAM 2: Post-Event & Liquidation Reports */")
  );
  assert.ok(
    !tableRowsSnippet.includes('w-1.5 h-1.5 rounded-full'),
    "Proposal table rows must NOT render indicator dots inside status badge pills"
  );

  const postEventTableSnippet = osasCode.substring(
    osasCode.indexOf("paginatedPostEvents.map"),
    osasCode.indexOf("/* KANBAN BOARD VIEW FOR POST-EVENTS */")
  );
  assert.ok(
    !postEventTableSnippet.includes('w-1.5 h-1.5 rounded-full'),
    "Post-event table rows must NOT render indicator dots inside status badge pills"
  );
});

test("OsasRecordList implements true vertically stacked list/card layout with grouping", () => {
  const listCode = fs.readFileSync(OSAS_RECORD_LIST_PATH, "utf8");

  // 1. Grouping support (by status, organization, none)
  assert.ok(
    listCode.includes('groupBy === "none"') &&
    listCode.includes('groupBy === "organization"') &&
    listCode.includes("PROPOSAL_STATUS_GROUPS"),
    "OsasRecordList must support grouping by status, organization, and none"
  );

  // 2. Collapsible accordion headers
  assert.ok(
    listCode.includes("toggleGroup"),
    "OsasRecordList must have interactive collapsible group headers"
  );

  // 3. Rich card details
  assert.ok(
    listCode.includes("verified_org_name") || listCode.includes("organization_name"),
    "Cards must display organization information"
  );
  assert.ok(
    listCode.includes("student_name") || listCode.includes("submitted_by_name"),
    "Cards must display submitter/student information"
  );

  // 4. Apple HIG text-only badges (no indicator dots)
  assert.ok(
    !listCode.includes('w-1.5 h-1.5 rounded-full'),
    "OsasRecordList cards must strictly use text-only status badges without indicator dots"
  );
});

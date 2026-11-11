import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const MY_ACTIVITY_PATH = path.resolve("src/components/shared/MyActivityPanel.js");
const SETTINGS_PANEL_PATH = path.resolve("src/components/shared/AccountSettingsPanel.js");

test("MyActivityPanel aligns strictly with DASHBOARD_LAYOUT_AND_TOOLBAR_STANDARDS.md", () => {
  const code = fs.readFileSync(MY_ACTIVITY_PATH, "utf8");

  // 1. Container Hierarchy & Card Wrapper (Section 1)
  assert.ok(code.includes("<Card className="), "Must be wrapped inside a Card component");
  assert.ok(code.includes("rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta"), "Must use standardized continuous Card geometry");

  // 2. PageHeader Inline Metric & Action Group (Section 2)
  assert.ok(code.includes("{total.toLocaleString()} records"), "PageHeader title must contain inline record count summary");
  assert.ok(code.includes('className="h-9 w-9"'), "RefreshButton must specify h-9 w-9");

  // 3. Toolbar Left & Right Split Layout (Section 4)
  assert.ok(code.includes('<div className="flex min-w-0 items-center gap-2">'), "Toolbar must include Left Group flex container");
  assert.ok(code.includes('<div className="ml-auto flex shrink-0 items-center gap-2">'), "Toolbar must include Right Group ml-auto container");

  // 4. Standardized Search Input Width (Section 5)
  assert.ok(code.includes('className="w-72 sm:w-80 shrink-0"'), "DashboardSearch must strictly use w-72 sm:w-80 shrink-0 token");
  assert.ok(!code.includes("flex-1 sm:w-64 min-w-[200px] max-w-sm"), "DashboardSearch must not have custom ad-hoc width overrides");

  // 5. Canonical FilterPopover from OfficeTableControls (Section 4 & 8)
  assert.ok(code.includes('import { FilterPopover } from "@/components/systemadmin/OfficeTableControls"'), "Must import canonical FilterPopover");
  assert.ok(code.includes("<FilterPopover"), "Must render canonical FilterPopover");
  assert.ok(code.includes('entityLabel="activity"'), "Must pass entityLabel='activity' to FilterPopover");
  assert.ok(code.includes('useViewPreference("activity", "filterRules", [])'), "Must persist filterRules with useViewPreference");

  // 6. Vanity Stat Cards Prohibited (Section 1 Single-Card Doctrine)
  assert.ok(!code.includes("LogStatCards"), "Must not include vanity KPI stat cards");

  // 6. Default 50 Rows Per Page (Section 9.5)
  assert.ok(code.includes('useViewPreference("activity", "perPage", 50)'), "My Activity must default to 50 rows per page");

  // 7. Typography & Quoted Highlights in Description
  assert.ok(code.includes("NarrativeText"), "Must implement NarrativeText component");
  assert.ok(code.includes("renderFormattedDetails"), "Must implement formatted narrative parser");

  // 8. Standardized rounded-full Badge Border Radius (Section 8.1)
  assert.ok(code.includes("BADGE_BASE"), "Severity badges must use standard BADGE_BASE");
  assert.ok(!code.includes("px-2 py-0.5 text-[10px]"), "Must eliminate non-standard badge sizing");

  // 9. Semantic Action Icons & Avatar Badges
  assert.ok(code.includes("<ActionIcon size={18} aria-hidden=\"true\" />"), "Must render direct ActionIcon component");
  assert.ok(code.includes("getActivityVisual"), "Must implement action-aware getActivityVisual");

  // 10. Footer hidden when empty
  assert.ok(code.includes("!error && rows.length > 0 &&"), "Pagination footer must only render when there are activity rows");
});

test("AccountSettingsPanel does not contain orphan MyActivityPanel embedding", () => {
  const settingsCode = fs.readFileSync(SETTINGS_PANEL_PATH, "utf8");

  assert.ok(!settingsCode.includes("import MyActivityPanel"), "Settings panel must not import MyActivityPanel");
  assert.ok(!settingsCode.includes("<MyActivityPanel"), "Settings panel must not render MyActivityPanel");
  assert.ok(!settingsCode.includes('value="activity"'), "Settings tabs must not contain activity tab trigger or content");
});

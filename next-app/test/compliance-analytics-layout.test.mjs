import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPLIANCE_TAB_PATH = path.resolve(
  __dirname,
  "../src/components/admin/DigitizationComplianceTab.js"
);
const COMPLIANCE_SHEET_PATH = path.resolve(
  __dirname,
  "../src/components/shared/ComplianceStudentsSheet.js"
);
const COMPLIANCE_LIST_PATH = path.resolve(
  __dirname,
  "../src/components/shared/ComplianceStudentsList.js"
);
const COMPLIANCE_REPO_PATH = path.resolve(
  __dirname,
  "../src/lib/digitizationComplianceRepo.js"
);

test("Digitization Compliance layout, toolbar, and stat cards design standards", () => {
  const complianceCode = fs.readFileSync(COMPLIANCE_TAB_PATH, "utf8");

  // 1. Single unified outer Card container
  assert.ok(
    complianceCode.includes("<Card className=\"flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta\">"),
    "Compliance tab must wrap all dashboard sections in a continuous rounded-2xl Card"
  );

  // 2. PageHeader with inline count and RefreshButton exemption
  assert.ok(
    complianceCode.includes("<PageHeader"),
    "PageHeader must be rendered"
  );
  assert.ok(
    complianceCode.includes("<RefreshButton"),
    "RefreshButton must be present in PageHeader actions"
  );
  assert.ok(
    complianceCode.includes("Export CSV") && complianceCode.includes("PDF_ACTION_LABELS.preview"),
    "Direct actions must include Export CSV and Preview PDF without an overflow 3-dot menu"
  );
  assert.ok(
    !complianceCode.includes("secondaryActions"),
    "There should not be a secondary actions overflow menu when only standard export buttons exist"
  );

  // 3. Steady, non-interactive Records Review style Stat Cards
  assert.ok(
    complianceCode.includes("rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]"),
    "Stat cards must be housed in an elevated soft-gray container matching Records Review"
  );
  assert.ok(
    complianceCode.includes("Document Coverage") &&
      complianceCode.includes("Students Evaluated") &&
      complianceCode.includes("Fully Digitized"),
    "Must preserve the 3 core compliance metrics cards"
  );
  assert.ok(
    !complianceCode.includes("selectedKpi") && !complianceCode.includes("setSelectedKpi"),
    "Redundant click dropdown card on KPI selection must be completely removed"
  );

  // 4. Connected Segmented Tabs Row with Equal Width and Permanent Badges
  assert.ok(
    complianceCode.includes("SegmentedControl"),
    "Must use SegmentedControl for status scope tabs"
  );
  assert.ok(
    complianceCode.includes("auto-cols-fr shrink-0"),
    "Tabs must have equal-width auto-cols-fr styling"
  );
  assert.ok(
    complianceCode.includes("summary?.activeStudentsCount") &&
      complianceCode.includes("summary?.archivedStudentsCount"),
    "Both Active and Archived tabs must receive permanent count badges from summary data"
  );

  // 5. Digitization Progress & Missing Documents Section placed directly below Segmented Tabs
  const tabsIndex = complianceCode.indexOf("SegmentedControl");
  const progressIndex = complianceCode.indexOf("Digitization Progress");
  const toolbarIndex = complianceCode.indexOf("<DataViewToolbar");
  const tableIndex = complianceCode.indexOf("<Table columns=");

  assert.ok(tabsIndex !== -1, "SegmentedControl must exist");
  assert.ok(progressIndex !== -1, "Digitization Progress must exist");
  assert.ok(toolbarIndex !== -1, "DataViewToolbar must exist");
  assert.ok(tableIndex !== -1, "Table must exist");

  assert.ok(
    tabsIndex < progressIndex,
    "Segmented tabs must precede Digitization Progress section"
  );
  assert.ok(
    progressIndex < toolbarIndex,
    "Digitization Progress section must precede DataViewToolbar"
  );
  assert.ok(
    toolbarIndex < tableIndex,
    "DataViewToolbar must be placed directly on top of the Program Breakdown Table"
  );

  // 6. DataViewToolbar controls
  assert.ok(
    complianceCode.includes("<DashboardSearch"),
    "Toolbar must include DashboardSearch"
  );
  assert.ok(
    complianceCode.includes("<FilterPopover") && complianceCode.includes("<SortPopover"),
    "Toolbar must include standardized FilterPopover and SortPopover"
  );
  assert.ok(
    complianceCode.includes("<TableScrollControls"),
    "Toolbar must include TableScrollControls"
  );

  // 7. Standardized EmptyState in Missing Documents section
  assert.ok(
    complianceCode.includes("<EmptyState") && complianceCode.includes('variant="compact"'),
    "Missing Documents section must use standardized EmptyState component with variant='compact'"
  );
  assert.ok(
    !complianceCode.includes("rounded-2xl border border-border bg-gray-50/50 dark:bg-zinc-900/30"),
    "Missing Documents section must not wrap EmptyState in decorative enclosing boxes"
  );
});

test("Incomplete Records Sheet and List progressive loading & Apple Inset styling", () => {
  const sheetCode = fs.readFileSync(COMPLIANCE_SHEET_PATH, "utf8");
  const listCode = fs.readFileSync(COMPLIANCE_LIST_PATH, "utf8");

  // 1. ComplianceStudentsSheet must use progressive loading instead of table pagination
  assert.ok(
    !sheetCode.includes("SheetPagination"),
    "SheetPagination should be removed in favor of progressive loading"
  );
  assert.ok(
    sheetCode.includes("View More (") && sheetCode.includes("All ") && sheetCode.includes("displayed"),
    "Must implement progressive loading matching Global Directory with View More (X of Y) and All X records displayed"
  );

  // 2. Button styling in sheet footer
  assert.ok(
    sheetCode.includes("h-9 px-4 text-xs font-semibold rounded-xl"),
    "Sheet footer buttons must strictly follow h-9 px-4 text-xs font-semibold rounded-xl"
  );

  // 3. Sheet header has no icon and no visible subdescription
  assert.ok(
    !sheetCode.includes("UserSearch01Icon"),
    "SheetHeader must not have circular icon avatar"
  );
  assert.ok(
    sheetCode.includes('<SheetDescription className="sr-only">'),
    "SheetHeader subdescription must be sr-only to keep header clean"
  );

  // 4. ComplianceStudentsList Apple Inset Cards and ProfileAvatar
  assert.ok(
    listCode.includes("<ProfileAvatar"),
    "Compliance students list items must display circular ProfileAvatar"
  );
  assert.ok(
    listCode.includes("rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-900/60"),
    "Students list items must be styled as Apple Inset Cards"
  );
  assert.ok(
    listCode.includes("BADGE_BASE") && listCode.includes("BADGE_PALETTES"),
    "Badges must use borderless standard tokens (BADGE_BASE + BADGE_PALETTES)"
  );
});

test("Compliance Repository returns permanent active and archived student counts", () => {
  const repoCode = fs.readFileSync(COMPLIANCE_REPO_PATH, "utf8");

  assert.ok(
    repoCode.includes("active_students_count") && repoCode.includes("archived_students_count"),
    "loadComplianceSnapshot must query active and archived student counts simultaneously"
  );
  assert.ok(
    repoCode.includes("activeStudentsCount:") && repoCode.includes("archivedStudentsCount:"),
    "Summary must expose activeStudentsCount and archivedStudentsCount properties"
  );
});

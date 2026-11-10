import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

test("Admin Staff Directory: PageHeader contains inline metric summary", () => {
  const staffDirFile = path.join(ROOT_DIR, "src/components/admin/StaffDirectoryTab.js");
  assert.ok(fs.existsSync(staffDirFile), "StaffDirectoryTab.js must exist");
  const content = fs.readFileSync(staffDirFile, "utf8");

  // Inline metrics in PageHeader title
  assert.match(
    content,
    /personnel\s*·.*administrator/i,
    "PageHeader title must include inline metric summary (e.g. X personnel · Y administrators)"
  );
  assert.match(
    content,
    /tabular-nums/,
    "Metric summary must use tabular-nums for aligned digits"
  );
});

test("Admin Staff Directory: Connected tabs row with Active/Archived and [Grid] [Table] view switcher", () => {
  const staffDirFile = path.join(ROOT_DIR, "src/components/admin/StaffDirectoryTab.js");
  const content = fs.readFileSync(staffDirFile, "utf8");

  // SegmentedControl for Active vs Archived
  assert.match(
    content,
    /SegmentedControl[\s\S]*value=\{activeTab\}[\s\S]*items=\{[\s\S]*value:\s*["']active["'][\s\S]*value:\s*["']archived["']/,
    "Must have SegmentedControl for active and archived tabs"
  );

  // View mode switcher adhering to canonical [Grid] [Table] sequence
  assert.match(
    content,
    /value:\s*["']grid["'][\s\S]*label:\s*["']Grid["'][\s\S]*value:\s*["']table["'][\s\S]*label:\s*["']Table["']/,
    "Must have [Grid] [Table] view switcher with canonical sequence"
  );

  assert.match(
    content,
    /ViewModeIcon/,
    "View mode switcher must use ViewModeIcon"
  );

  // Equal-width auto-cols-fr segmented control
  assert.match(
    content,
    /inline-grid\s+grid-flow-col\s+auto-cols-fr/,
    "Segmented controls must use equal-width auto-cols-fr container"
  );
});

test("Admin Staff Directory: 2-zone DataViewToolbar layout with DashboardSearch, FilterPopover, SortPopover, GroupPopover, and ColumnsPopover", () => {
  const staffDirFile = path.join(ROOT_DIR, "src/components/admin/StaffDirectoryTab.js");
  const content = fs.readFileSync(staffDirFile, "utf8");

  assert.match(
    content,
    /DashboardSearch/,
    "Toolbar must use DashboardSearch"
  );

  assert.match(
    content,
    /FilterPopover/,
    "Toolbar must provide standardized FilterPopover for rule-based filtering"
  );

  assert.match(
    content,
    /SortPopover/,
    "Toolbar must provide SortPopover for sorting in both Grid and Table modes"
  );

  assert.match(
    content,
    /GroupPopover/,
    "Toolbar must provide GroupPopover for grouping records (by role, section, 2FA, none)"
  );

  assert.match(
    content,
    /ColumnsPopover/,
    "Toolbar must provide ColumnsPopover for customizing visible table columns"
  );

  assert.match(
    content,
    /TableScrollControls/,
    "Toolbar must render TableScrollControls"
  );
});

test("Admin Staff Directory: Option B action menu with semantic danger/success colors", () => {
  const staffDirFile = path.join(ROOT_DIR, "src/components/admin/StaffDirectoryTab.js");
  const content = fs.readFileSync(staffDirFile, "utf8");

  assert.match(
    content,
    /PersonnelActionsMenu/,
    "Staff Directory must use PersonnelActionsMenu for Option B kebab action menu"
  );

  assert.match(
    content,
    /entityName=["']Staff["']/,
    "PersonnelActionsMenu must receive entityName='Staff'"
  );

  // Check PersonnelActionsMenu component for danger/success styling
  const menuFile = path.join(ROOT_DIR, "src/components/systemadmin/PersonnelActionsMenu.js");
  const menuContent = fs.readFileSync(menuFile, "utf8");

  assert.match(
    menuContent,
    /text-red-600.*hover:bg-red-50/,
    "Archive action must use semantic danger colors (text-red-600 hover:bg-red-50)"
  );

  assert.match(
    menuContent,
    /text-emerald-700.*hover:bg-emerald-50/,
    "Restore action must use semantic success colors (text-emerald-700 hover:bg-emerald-50)"
  );
});

test("Admin Staff Directory: Grid View with compact profile cards, interactive add card, and neutral Sheet archive", () => {
  const staffDirFile = path.join(ROOT_DIR, "src/components/admin/StaffDirectoryTab.js");
  const content = fs.readFileSync(staffDirFile, "utf8");

  // Grid view rendering
  assert.match(
    content,
    /grid-cols-1\s+sm:grid-cols-2/,
    "Grid view must render responsive grid columns"
  );

  // Compact card sizing: p-4 and size-9 avatar
  assert.match(
    content,
    /p-4\s+rounded-2xl/,
    "Grid cards must use compact p-4 padding"
  );

  assert.match(
    content,
    /size-9\s+rounded-full/,
    "Grid cards must use compact size-9 avatar"
  );

  // Interactive Add Card in grid view
  assert.match(
    content,
    /border-dashed[\s\S]*Register Staff/,
    "Grid view must include interactive dashed Add Card for registering staff"
  );

  // Slide-over Sheet for staff details
  assert.match(
    content,
    /Sheet[\s\S]*SheetContent[\s\S]*SheetHeader[\s\S]*SheetTitle/,
    "Must implement slide-over Sheet for inspecting staff details"
  );

  assert.match(
    content,
    /SheetPagination/,
    "Staff detail sheet must include SheetPagination for record navigation"
  );

  // Neutral Archive button in SheetFooter (aligned with global directory, no reddish text/hover)
  const sheetFooterMatch = content.match(/<SheetFooter[\s\S]*?<\/SheetFooter>/);
  assert.ok(sheetFooterMatch, "SheetFooter must be present in slide-over Sheet");
  assert.doesNotMatch(
    sheetFooterMatch[0],
    /text-red-600|hover:bg-red-50/,
    "Archive button in SheetFooter must be clean neutral outline without reddish text or hover (aligned with global directory)"
  );

  // Table column width optimization: 2FA reduced to 9%, Staff Name expanded to 33%
  assert.match(
    content,
    /w-\[33%\]/,
    "Table Staff Name column must be expanded to 33% to prevent name truncation"
  );

  assert.match(
    content,
    /w-\[9%\]/,
    "Table 2FA Status column must be reduced to 9% for compact indicator"
  );
});

test("Admin Staff Directory: Skeleton mirrors 2-tier tabs/toolbar hierarchy and h-9 buttons", () => {
  const skeletonFile = path.join(ROOT_DIR, "src/components/admin/skeletons/StaffDirectorySkeleton.js");
  assert.ok(fs.existsSync(skeletonFile), "StaffDirectorySkeleton.js must exist");
  const content = fs.readFileSync(skeletonFile, "utf8");

  // Header metric skeleton
  assert.match(
    content,
    /inline-grid\s+grid-flow-col\s+auto-cols-fr/,
    "Skeleton must mirror equal-width segmented control"
  );

  // Strict h-9 sizing on action buttons (no h-10 w-10 or h-10 w-32)
  assert.doesNotMatch(
    content,
    /h-10\s+w-10/,
    "Skeleton must not have h-10 w-10 buttons; must use h-9"
  );
  assert.doesNotMatch(
    content,
    /h-10\s+w-32/,
    "Skeleton must not have h-10 w-32 buttons; must use h-9"
  );
  assert.match(
    content,
    /h-9/,
    "Skeleton must use h-9 for action buttons"
  );
});

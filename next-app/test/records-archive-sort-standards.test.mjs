import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

test("Records & Archive: Sort component aligns with the canonical SortPopover design", () => {
  const recordsArchiveFile = path.join(ROOT_DIR, "src/components/staff/RecordsArchiveTab.js");
  assert.ok(fs.existsSync(recordsArchiveFile), "RecordsArchiveTab.js must exist");
  const content = fs.readFileSync(recordsArchiveFile, "utf8");

  // 1. Must import SortPopover from OfficeTableControls
  assert.match(
    content,
    /import\s+\{[^}]*SortPopover[^}]*\}\s+from\s+["']@\/components\/systemadmin\/OfficeTableControls["']/,
    "RecordsArchiveTab must import SortPopover from OfficeTableControls"
  );

  // 2. Must render SortPopover with options, sortBy, onSortByChange, sortOrder, onSortOrderChange
  assert.match(
    content,
    /<SortPopover[\s\S]*options=\{sortOptions\}[\s\S]*sortBy=\{currentSortBy\}[\s\S]*onSortByChange=\{handleSortByChange\}[\s\S]*sortOrder=\{currentSortOrder\}[\s\S]*onSortOrderChange=\{handleSortOrderChange\}/,
    "RecordsArchiveTab must render SortPopover with standard props"
  );

  // 3. Must not use old DropdownMenu for sorting
  assert.doesNotMatch(
    content,
    /from\s+["']@\/components\/ui\/dropdown-menu["']/,
    "RecordsArchiveTab must not import DropdownMenu for sort controls"
  );
  assert.doesNotMatch(
    content,
    /<DropdownMenu>/,
    "RecordsArchiveTab must not render legacy DropdownMenu"
  );

  // 4. Must not use AppIcon with phosphor icon classes for sorting
  assert.doesNotMatch(
    content,
    /AppIcon.*Sorting(Up|Down)Icon/,
    "Must not use legacy AppIcon SortingUpIcon/SortingDownIcon"
  );

  // 5. Must not render table view or view mode toggle for students inside folders
  assert.doesNotMatch(
    content,
    /<Table\s+columns=/,
    "RecordsArchiveTab must not render table view for student records inside folders"
  );
  assert.doesNotMatch(
    content,
    /ViewModeIcon/,
    "RecordsArchiveTab must not render card/table view mode switchers"
  );
});

test("OfficeTableControls: SortPopover supports alignment and className overrides", () => {
  const officeControlsFile = path.join(ROOT_DIR, "src/components/systemadmin/OfficeTableControls.js");
  const content = fs.readFileSync(officeControlsFile, "utf8");

  assert.match(
    content,
    /export\s+function\s+SortPopover\(\s*\{[^}]*align\s*=\s*["']start["'][^}]*\}\s*\)/,
    "SortPopover must accept an align prop defaulting to start"
  );
});

test("GoogleDrivePdfCard: Document actions use headerless Popover conforming to action menu standards", () => {
  const cardFile = path.join(ROOT_DIR, "src/components/staff/GoogleDrivePdfCard.js");
  assert.ok(fs.existsSync(cardFile), "GoogleDrivePdfCard.js must exist");
  const content = fs.readFileSync(cardFile, "utf8");

  // 1. Must import Popover, PopoverContent, PopoverTrigger from "@/components/ui/popover"
  assert.match(
    content,
    /import\s+\{[^}]*Popover[^}]*PopoverContent[^}]*PopoverTrigger[^}]*\}\s+from\s+["']@\/components\/ui\/popover["']/,
    "GoogleDrivePdfCard must import Popover primitives from @/components/ui/popover"
  );

  // 2. Must not import from dropdown-menu
  assert.doesNotMatch(
    content,
    /from\s+["']@\/components\/ui\/dropdown-menu["']/,
    "GoogleDrivePdfCard must not import from dropdown-menu"
  );

  // 3. Must not render legacy header zone or Document Actions header
  assert.doesNotMatch(
    content,
    /Zone 1:\s*Header/i,
    "GoogleDrivePdfCard must not include legacy Zone 1: Header"
  );
  assert.doesNotMatch(
    content,
    /Document Actions/,
    "GoogleDrivePdfCard must not render legacy Document Actions header"
  );

  // 4. Must use PopoverContent with headerless styling
  assert.match(
    content,
    /<PopoverContent[\s\S]*align=["']end["'][\s\S]*className=["'][^"']*rounded-2xl[^"']*["']/,
    "GoogleDrivePdfCard must render PopoverContent with rounded-2xl"
  );

  // 5. Must use table-action-button in list view trigger
  assert.match(
    content,
    /table-action-button\s+rounded-lg\s+active:scale-95\s+cursor-pointer/,
    "GoogleDrivePdfCard must use table-action-button for list view trigger"
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const DOC_TYPES_PATH = path.resolve("src/components/admin/system-config/DocTypesTab.js");
const COURSES_PATH = path.resolve("src/components/admin/system-config/CoursesTab.js");
const SECTIONS_PATH = path.resolve("src/components/admin/system-config/SectionsTab.js");

test("System Configuration: Document Types tab group removed, spacious column padding and balanced allocation", () => {
  const content = fs.readFileSync(DOC_TYPES_PATH, "utf8");

  // 1. Verify [ All | Requestable | Compliance ] segmented tab group is removed
  assert.ok(
    !content.includes('docPurposeFilter === "all"'),
    "DocTypesTab must NOT render the All / Requestable / Compliance segmented tab group"
  );

  // 2. Active/Archived status tabs use standard SegmentedControl
  assert.ok(
    content.includes('<SegmentedControl') && content.includes('variant="capsule"'),
    "DocTypesTab must use standard SegmentedControl with variant='capsule' for status tabs"
  );
  assert.ok(
    content.includes('setShowArchived(val === "archived")') || (content.includes('setShowArchived(false)') && content.includes('setShowArchived(true)')),
    "DocTypesTab must retain Active vs Archived status tabs"
  );

  // 3. Document Type column has dominant space allocation without artificial 340px clamp
  assert.ok(
    content.includes('growthWeight: 4') || content.includes('growthWeight: 5') || content.includes('growthWeight: 6'),
    "DocTypesTab name column must have dominant growthWeight"
  );
  assert.ok(
    content.includes('w-[52%]') || content.includes('w-[54%]'),
    "DocTypesTab Document Type th must have dominant width"
  );
  assert.ok(
    !content.includes('maxWidth: 340'),
    "DocTypesTab Document Type column must not clamp to 340px"
  );

  // 4. Purpose and Status columns have spacious padding on both sides
  assert.ok(
    content.includes('w-[22%] p-4 px-6'),
    "DocTypesTab Purpose / Scope th must have spacious px-6 padding and generous width"
  );
  assert.ok(
    content.includes('w-[14%] p-4 px-6'),
    "DocTypesTab Status th must have spacious px-6 padding and generous width"
  );
  assert.ok(
    content.includes('p-4 px-6 align-middle whitespace-nowrap border-r'),
    "DocTypesTab Purpose td must have px-6 padding"
  );
  assert.ok(
    content.includes('p-4 px-6 align-middle text-left whitespace-nowrap border-r'),
    "DocTypesTab Status td must have px-6 padding"
  );
});

test("System Configuration: Degree Programs (CoursesTab) compacts Code and provides space on both sides", () => {
  const content = fs.readFileSync(COURSES_PATH, "utf8");

  // 1. Code column has spacious px-6 padding and comfortable width
  assert.ok(
    content.includes('w-[18%] p-4 px-6'),
    "CoursesTab Code column th must have comfortable width (w-[18%]) and px-6 padding"
  );
  assert.ok(
    content.includes('p-4 px-6 align-middle whitespace-nowrap border-r'),
    "CoursesTab Code column td must have px-6 padding"
  );

  // 2. Designation column has dominant width and growth
  assert.ok(
    content.includes('w-[56%]'),
    "CoursesTab Designation column th must have dominant width"
  );
  assert.ok(
    !content.includes('maxWidth: 340'),
    "CoursesTab Designation column must not be clamped to 340px"
  );

  // 3. Status column has spacious px-6 padding and comfortable width
  assert.ok(
    content.includes('w-[14%] p-4 px-6'),
    "CoursesTab Status column th must have comfortable width (w-[14%]) and px-6 padding"
  );
  assert.ok(
    content.includes('p-4 px-6 align-middle text-left whitespace-nowrap border-r'),
    "CoursesTab Status column td must have px-6 padding"
  );

  // 4. Standard SegmentedControl for Active/Archived
  assert.ok(
    content.includes('<SegmentedControl') && content.includes('variant="capsule"'),
    "CoursesTab must use standard SegmentedControl with variant='capsule' for status tabs"
  );
});

test("System Configuration: Course Blocks (SectionsTab) provides space on both sides of Code and Status", () => {
  const content = fs.readFileSync(SECTIONS_PATH, "utf8");

  // 1. Degree Program column has comfortable width and px-6 padding
  assert.ok(
    content.includes('w-[18%] p-4 px-6'),
    "SectionsTab Degree Program column th must have comfortable width (w-[18%]) and px-6 padding"
  );
  assert.ok(
    content.includes('p-4 px-6 align-middle whitespace-nowrap border-r'),
    "SectionsTab Degree Program column td must have px-6 padding"
  );

  // 2. Block Name column has dominant width and growth
  assert.ok(
    content.includes('w-[56%]'),
    "SectionsTab Block Name column th must have dominant width"
  );
  assert.ok(
    !content.includes('maxWidth: 340'),
    "SectionsTab Block Name column must not be clamped to 340px"
  );

  // 3. Status column has spacious px-6 padding and comfortable width
  assert.ok(
    content.includes('w-[14%] p-4 px-6'),
    "SectionsTab Status column th must have comfortable width (w-[14%]) and px-6 padding"
  );
  assert.ok(
    content.includes('p-4 px-6 align-middle text-left whitespace-nowrap border-r'),
    "SectionsTab Status column td must have px-6 padding"
  );

  // 4. Standard SegmentedControl for Active/Archived
  assert.ok(
    content.includes('<SegmentedControl') && content.includes('variant="capsule"'),
    "SectionsTab must use standard SegmentedControl with variant='capsule' for status tabs"
  );
});

test("System Configuration: Popovers use red label and hover for Archive actions", () => {
  const actionsMenuPath = path.resolve("src/components/admin/system-config/TaxonomyActionsMenu.js");
  const actionsMenuContent = fs.readFileSync(actionsMenuPath, "utf8");

  // 1. TaxonomyActionsMenu has red label and hover for archive
  assert.match(
    actionsMenuContent,
    /text-red-600.*hover:bg-red-50/,
    "TaxonomyActionsMenu must use semantic red colors (text-red-600 hover:bg-red-50) for Archive"
  );
  assert.match(
    actionsMenuContent,
    /text-emerald-700.*hover:bg-emerald-50/,
    "TaxonomyActionsMenu must use semantic success colors for Restore"
  );

  // 2. DocTypesTab, CoursesTab, SectionsTab use TaxonomyActionsMenu
  const docTypesContent = fs.readFileSync(DOC_TYPES_PATH, "utf8");
  assert.ok(
    docTypesContent.includes("<TaxonomyActionsMenu"),
    "DocTypesTab must render TaxonomyActionsMenu popover"
  );

  const coursesContent = fs.readFileSync(COURSES_PATH, "utf8");
  assert.ok(
    coursesContent.includes("<TaxonomyActionsMenu"),
    "CoursesTab must render TaxonomyActionsMenu popover"
  );

  const sectionsContent = fs.readFileSync(SECTIONS_PATH, "utf8");
  assert.ok(
    sectionsContent.includes("<TaxonomyActionsMenu"),
    "SectionsTab must render TaxonomyActionsMenu popover"
  );

  // 3. TableActions.js regex includes archive
  const tableActionsPath = path.resolve("src/components/shared/TableActions.js");
  const tableActionsContent = fs.readFileSync(tableActionsPath, "utf8");
  assert.match(
    tableActionsContent,
    /archive.*destructive/,
    "TableActions.js must flag archive actions as destructive for red label and hover"
  );
});

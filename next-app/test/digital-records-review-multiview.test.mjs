import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REVIEW_TAB_PATH = path.resolve(
  __dirname,
  "../src/components/admin/DigitalRecordsReviewTab.js"
);
const RECORDS_LIST_PATH = path.resolve(
  __dirname,
  "../src/components/admin/records-review/DigitalRecordsList.js"
);
const KANBAN_PIPELINE_PATH = path.resolve(
  __dirname,
  "../src/components/admin/records-review/DigitalRecordsKanbanPipeline.js"
);

test("Digital Records Review multi-view architecture and toolbar design standards", () => {
  const reviewCode = fs.readFileSync(REVIEW_TAB_PATH, "utf8");

  // 1. PageHeader and RefreshButton with anti-flicker loading
  assert.ok(
    reviewCode.includes("<PageHeader"),
    "PageHeader must be rendered"
  );
  assert.ok(
    reviewCode.includes("isLoading={isManualLoading}"),
    "RefreshButton must bind to isManualLoading to prevent layout tearing skeletons"
  );

  // 2. Connected Segmented Tabs Row with equal-width capsule controls
  assert.ok(
    reviewCode.includes('aria-label="Digital records review status scope and view mode"'),
    "Must include connected segmented tabs row with accessible aria-label"
  );
  assert.ok(
    reviewCode.includes('auto-cols-fr shrink-0'),
    "Segmented controls must use auto-cols-fr for equal width tabs"
  );
  assert.ok(
    reviewCode.includes('{ value: "All", label: "All Records"') &&
      reviewCode.includes('{ value: "Pending", label: "Pending"') &&
      reviewCode.includes('{ value: "Approved", label: "Approved"') &&
      reviewCode.includes('{ value: "Declined", label: "Declined"'),
    "Status scope pills must support All, Pending, Approved, and Declined"
  );

  // 3. 3-Way View Mode Switcher
  assert.ok(
    reviewCode.includes('value: "list"') &&
      reviewCode.includes('value: "table"') &&
      reviewCode.includes('value: "kanban"'),
    "Must offer 3 distinct visualization modes: List, Table, and Kanban"
  );
  assert.ok(
    reviewCode.includes("<ViewModeIcon mode="),
    "Must use ViewModeIcon for view mode tab icons"
  );

  // 4. DataViewToolbar with DashboardSearch and OfficeTableControls
  assert.ok(
    reviewCode.includes("<DashboardSearch"),
    "DataViewToolbar must use the standardized DashboardSearch component"
  );
  assert.ok(
    reviewCode.includes("<FilterPopover") &&
      reviewCode.includes("<SortPopover") &&
      reviewCode.includes("<GroupPopover") &&
      reviewCode.includes("<ColumnsPopover"),
    "DataViewToolbar must reuse OfficeTableControls (FilterPopover, SortPopover, GroupPopover, ColumnsPopover)"
  );
  assert.ok(
    reviewCode.includes("<TableScrollControls"),
    "TableScrollControls must be rendered when in table view"
  );

  // 5. ActiveFilterChips conditional mounting
  assert.ok(
    reviewCode.includes("activeChips.length > 0 &&"),
    "ActiveFilterChips row must be conditionally rendered only when activeChips exist"
  );

  // 6. Anti-Flicker: Lazy useState initialization
  assert.ok(
    reviewCode.includes("const [viewMode, setViewMode] = useState(() =>"),
    "viewMode must be lazily initialized in useState to prevent first-paint flickering"
  );

  // 7. Strictly Text-Only Status Badges (No indicator dots)
  assert.ok(
    !reviewCode.includes("w-1.5 h-1.5 rounded-full"),
    "Must not include w-1.5 h-1.5 indicator dots in status badge pills"
  );

  // 8. Integration of DigitalRecordsList and DigitalRecordsKanbanPipeline
  assert.ok(
    reviewCode.includes("<DigitalRecordsList"),
    "Must render DigitalRecordsList in list mode"
  );
  assert.ok(
    reviewCode.includes("<DigitalRecordsKanbanPipeline"),
    "Must render DigitalRecordsKanbanPipeline in kanban mode"
  );
});

test("DigitalRecordsList component design and features", () => {
  const listCode = fs.readFileSync(RECORDS_LIST_PATH, "utf8");

  // Grouping support
  assert.ok(
    listCode.includes('groupBy === "none"') &&
      listCode.includes('groupBy === "docType"'),
    "Must support grouping by status, docType, and none"
  );

  // Visual thumbnail indicator and preview action
  assert.ok(
    listCode.includes("Pdf01Icon") && listCode.includes("Preview Document"),
    "Must render visual document thumbnail card and dedicated preview action"
  );

  // Metadata and actions
  assert.ok(
    listCode.includes("formatTitleCase(record.student_name)") &&
      listCode.includes("record.student_no") &&
      listCode.includes("record.doc_type"),
    "Must display student name, student number, and document type"
  );
  assert.ok(
    listCode.includes("onApprove") &&
      listCode.includes("onDecline") &&
      listCode.includes("onPreview"),
    "Must support one-click Approve, Decline, and Preview triggers"
  );

  // Text-only badges
  assert.ok(
    !listCode.includes("w-1.5 h-1.5 rounded-full"),
    "DigitalRecordsList must not have indicator dots in status badges"
  );
});

test("DigitalRecordsKanbanPipeline component design and features", () => {
  const kanbanCode = fs.readFileSync(KANBAN_PIPELINE_PATH, "utf8");

  // Columns definition
  assert.ok(
    kanbanCode.includes('key: "Pending"') &&
      kanbanCode.includes('key: "Approved"') &&
      kanbanCode.includes('key: "Declined"'),
    "Kanban board must have Pending, Approved, and Declined swimlanes"
  );

  // Drag and drop support
  assert.ok(
    kanbanCode.includes("onDragStart") &&
      kanbanCode.includes("onDragOver") &&
      kanbanCode.includes("onDrop"),
    "Kanban board must implement HTML5 drag and drop handlers"
  );

  // Mouse pan / drag-to-scroll support
  assert.ok(
    kanbanCode.includes("handleMouseDownCanvas") &&
      kanbanCode.includes("isPanningActive"),
    "Kanban board must provide drag-to-scroll canvas panning"
  );

  // Quick actions
  assert.ok(
    kanbanCode.includes("onApprove") &&
      kanbanCode.includes("onDecline") &&
      kanbanCode.includes("onPreview"),
    "Kanban cards must provide quick Approve, Decline, and Preview actions"
  );
});

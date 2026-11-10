import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLA_TAB_PATH = path.resolve(
  __dirname,
  "../src/components/admin/SLAAnalyticsTab.js"
);
const SLA_KPI_CARDS_PATH = path.resolve(
  __dirname,
  "../src/components/admin/analytics/SlaKpiCards.js"
);
const SLA_FILTERS_PATH = path.resolve(
  __dirname,
  "../src/components/admin/analytics/SlaFilters.js"
);
const SLA_CHARTS_PATH = path.resolve(
  __dirname,
  "../src/components/admin/analytics/SlaCharts.js"
);
const SLA_SKELETON_PATH = path.resolve(
  __dirname,
  "../src/components/admin/skeletons/SLAAnalyticsSkeleton.js"
);
const SLA_KPI_SKELETON_PATH = path.resolve(
  __dirname,
  "../src/components/admin/skeletons/SlaKpiSkeleton.js"
);

test("SLA Analytics layout, toolbar, and stat cards design standards", () => {
  const slaTabCode = fs.readFileSync(SLA_TAB_PATH, "utf8");
  const slaKpiCode = fs.readFileSync(SLA_KPI_CARDS_PATH, "utf8");
  const slaFiltersCode = fs.readFileSync(SLA_FILTERS_PATH, "utf8");
  const slaChartsCode = fs.readFileSync(SLA_CHARTS_PATH, "utf8");
  const slaSkeletonCode = fs.readFileSync(SLA_SKELETON_PATH, "utf8");
  const slaKpiSkeletonCode = fs.readFileSync(SLA_KPI_SKELETON_PATH, "utf8");

  // 1. Single unified outer Card container
  assert.ok(
    slaTabCode.includes("overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card"),
    "SLA Analytics tab must wrap all dashboard sections in a continuous rounded-2xl Card"
  );

  // 2. PageHeader with inline metric summary and standard action buttons
  assert.ok(
    slaTabCode.includes("<PageHeader"),
    "PageHeader must be rendered"
  );
  assert.ok(
    slaTabCode.includes("total requests") && slaTabCode.includes("completed"),
    "PageHeader title must contain inline metric summary with total requests and completion rate"
  );
  assert.ok(
    slaTabCode.includes("<RefreshButton") && slaTabCode.includes('className="h-9 w-9"'),
    "RefreshButton must be present in PageHeader actions with h-9 w-9 sizing"
  );
  assert.ok(
    slaTabCode.includes("Export CSV") && slaTabCode.includes("PDF_ACTION_LABELS.preview"),
    "Actions must include Export CSV and Preview PDF triggers"
  );
  assert.ok(
    slaTabCode.includes("<DropdownMenu") && slaTabCode.includes("<DropdownMenuTrigger"),
    "PageHeader action buttons must provide dropdown menus for Export CSV and Preview PDF"
  );
  assert.ok(
    slaTabCode.includes('handleCsvExport("sla")') &&
      slaTabCode.includes('handleCsvExport("csm")') &&
      slaTabCode.includes('handleCsvExport("comprehensive")'),
    "Export CSV dropdown must offer SLA, CSM, and comprehensive options"
  );
  assert.ok(
    slaTabCode.includes('handlePreview("sla")') &&
      slaTabCode.includes('handlePreview("csm")') &&
      slaTabCode.includes('handlePreview("comprehensive")'),
    "Preview PDF dropdown must offer SLA, CSM, and comprehensive options"
  );
  assert.ok(
    slaTabCode.includes("<DropdownMenuLabel") &&
      slaTabCode.includes("Export Datasets") &&
      slaTabCode.includes("Official Reports"),
    "Dropdowns must use standard DropdownMenuLabel matching the Storage Layout template dropdown"
  );
  assert.ok(
    slaTabCode.includes('<DropdownMenuSeparator className="my-1 border-t border-border dark:border-white/10" />'),
    "Dropdowns must include visible separator with border-t between individual options and combined option"
  );

  // 3. Elevated Container for Stat Cards
  assert.ok(
    slaTabCode.includes("rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]"),
    "Stat cards in SLAAnalyticsTab must be enclosed in the canonical elevated container"
  );

  // 4. Steady, non-interactive Records Review style Stat Cards in SlaKpiCards
  assert.ok(
    !slaKpiCode.includes("Reorder.Group") && !slaKpiCode.includes("Reorder.Item"),
    "Draggable Reorder behavior must be removed from SlaKpiCards"
  );
  assert.ok(
    !slaKpiCode.includes("selectedKpi") && !slaKpiCode.includes("setSelectedKpi"),
    "Redundant click dropdown card must be removed from SlaKpiCards"
  );
  assert.ok(
    !slaKpiCode.includes("DragDropIcon"),
    "DragDropIcon must be removed from SlaKpiCards"
  );
  assert.ok(
    slaKpiCode.includes("Processing Time Standard") &&
      slaKpiCode.includes("Client Satisfaction") &&
      slaKpiCode.includes("Total Volume"),
    "Must preserve the 3 core metric cards"
  );

  // 5. DataViewToolbar in SlaFilters on pure white surface
  assert.ok(
    slaFiltersCode.includes("<DataViewToolbar"),
    "SlaFilters must use canonical DataViewToolbar"
  );
  assert.ok(
    slaFiltersCode.includes("bg-white dark:bg-card"),
    "SlaFilters toolbar must use pure white background, not gray"
  );
  assert.ok(
    slaFiltersCode.includes("<SegmentedControl") && slaFiltersCode.includes("auto-cols-fr"),
    "View mode segmented control in SlaFilters must use SegmentedControl with fluid spring motion and auto-cols-fr"
  );
  assert.ok(
    slaFiltersCode.includes("DateRangeFilterButton"),
    "DateRangeFilterButton must be present in SlaFilters"
  );

  // 6. ActiveFilterChips integration
  assert.ok(
    slaTabCode.includes("<ActiveFilterChips"),
    "SLA Analytics tab must integrate canonical ActiveFilterChips component"
  );

  // 7. Skeletons Parity
  assert.ok(
    slaSkeletonCode.includes("rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]"),
    "SLAAnalyticsSkeleton must house KPI skeleton in the canonical elevated container"
  );
  assert.ok(
    slaKpiSkeletonCode.includes("rounded-[18px]") && slaKpiSkeletonCode.includes("grid-cols-1 sm:grid-cols-3"),
    "SlaKpiSkeleton must match the exact 3-card geometry"
  );

  // 8. Canonical EmptyState in SlaCharts
  assert.ok(
    !slaChartsCode.includes("<Empty variant=\"compact\">"),
    "SlaCharts must use EmptyState rather than verbose Empty variant='compact'"
  );

  // 9. Reduced Motion support in Charts and Tab
  assert.ok(
    slaChartsCode.includes("useAppReducedMotion"),
    "SlaCharts must import and call useAppReducedMotion"
  );
  assert.ok(
    slaChartsCode.includes("isAnimationActive={!shouldReduceMotion}"),
    "Recharts graphical elements (Area, Bar, Pie, Tooltip) must respect shouldReduceMotion"
  );
  assert.ok(
    slaTabCode.includes("useAppReducedMotion"),
    "SLAAnalyticsTab must integrate useAppReducedMotion for page animations"
  );
});

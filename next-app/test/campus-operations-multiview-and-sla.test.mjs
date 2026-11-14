import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getRequestCharterStatus,
  buildSlaTiers,
  DEFAULT_SLA_STANDARDS,
} from "../src/lib/citizenCharter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TAB_PATH = path.resolve(
  __dirname,
  "../src/components/systemadmin/CampusOperationsTab.js"
);
const LIST_PATH = path.resolve(
  __dirname,
  "../src/components/systemadmin/CampusOperationsList.js"
);
const BADGE_STYLES_PATH = path.resolve(__dirname, "../src/lib/badgeStyles.js");
const PDF_GEN_PATH = path.resolve(__dirname, "../src/lib/pdfGenerator.js");
const SHEET_PATH = path.resolve(
  __dirname,
  "../src/components/systemadmin/ServiceStandardsSheet.js"
);

test("Campus Operations multi-view architecture, toolbar, and header actions standard", () => {
  const code = fs.readFileSync(TAB_PATH, "utf8");

  // 1. PageHeader with Refresh, Export CSV, and Preview PDF
  assert.ok(code.includes("<PageHeader"), "PageHeader must be rendered");
  assert.ok(code.includes("<RefreshButton"), "RefreshButton must be rendered");
  assert.ok(code.includes("Export CSV"), "Header actions must feature Export CSV button");
  assert.ok(code.includes("Preview PDF"), "Header actions must feature Preview PDF button");
  assert.ok(
    code.includes("handleDownloadCSV") && code.includes("handlePreviewReportPDF"),
    "Export handlers must be wired up"
  );

  // 2. Connected Segmented Tabs Row with Lifecycle and View Mode Switcher
  assert.ok(
    code.includes('aria-label="Operation lifecycle and view mode"'),
    "Must include connected segmented tabs row with accessible aria-label"
  );
  assert.ok(
    code.includes("auto-cols-fr"),
    "Segmented controls must use auto-cols-fr for equal width tabs"
  );
  assert.ok(
    code.includes('value: "list"') && code.includes('value: "table"'),
    "Must offer List and Table view switcher"
  );
  assert.ok(
    code.includes("<ViewModeIcon mode="),
    "Must use ViewModeIcon for view mode tab icons"
  );

  // 3. View Switcher Rendering: CampusOperationsList vs Table
  assert.ok(
    code.includes("<CampusOperationsList"),
    "Must render CampusOperationsList component in list mode"
  );
  assert.ok(
    code.includes('viewMode === "list" ?'),
    "Must toggle between list view and table view based on viewMode"
  );

  // 4. DataViewToolbar controls
  assert.ok(
    code.includes("<DashboardSearch"),
    "DataViewToolbar must use the standardized DashboardSearch component"
  );
  assert.ok(
    code.includes("<FilterPopover") &&
      code.includes("<SortPopover") &&
      code.includes("<GroupPopover"),
    "DataViewToolbar must provide FilterPopover, SortPopover, and GroupPopover"
  );
  assert.ok(
    code.includes('viewMode === "table" && (') && code.includes("<TableScrollControls"),
    "TableScrollControls must be conditional on table view"
  );
  assert.ok(
    code.includes('viewMode === "table" && (') && code.includes("<ColumnsPopover"),
    "ColumnsPopover must be conditional on table view"
  );
});

test("Citizen's Charter Turnaround Risk Tracker in Campus Operations", () => {
  const code = fs.readFileSync(TAB_PATH, "utf8");

  // Queue Risk in FilterPopover
  assert.ok(
    code.includes('id: "queue_risk"') || code.includes('key: "queue_risk"'),
    "Must feature Queue Risk / SLA inside filter fields"
  );
  assert.ok(
    code.includes("On Track") && code.includes("Due Today") && code.includes("Overdue"),
    "Must feature On Track, Due Today, and Overdue options in filter"
  );
  assert.ok(
    code.includes("Configure Standards"),
    "Turnaround standards banner must feature Configure Standards button"
  );

  // Table includes Charter SLA column and default unchecked state
  assert.ok(
    code.includes('"slaStatus"'),
    "OPERATION_COLUMNS must include slaStatus"
  );
  assert.ok(
    code.includes('key !== "updatedAt" && key !== "slaStatus"'),
    "Citizen's Charter SLA and Last Updated columns must be unchecked by default"
  );
  assert.ok(
    code.includes("Charter SLA"),
    "Table header and details must label SLA column as Charter SLA"
  );

  // Detail Sheet includes Charter SLA InfoRow
  assert.ok(
    code.includes('label="Current Stage"'),
    "Must preserve Current Stage row"
  );
  assert.ok(
    code.includes('label="Student Number"'),
    "Must preserve Student Number row"
  );
  assert.ok(
    code.includes('label="Charter SLA"'),
    "Must feature Charter SLA row in transaction detail sheet"
  );
  assert.ok(
    code.includes("getDepartmentBadgeClass"),
    "CampusOperationsTab must align department badge styling with CampusOperationsList via getDepartmentBadgeClass"
  );
});

test("CampusOperationsList component architecture and features", () => {
  assert.ok(fs.existsSync(LIST_PATH), "CampusOperationsList.js must exist");
  const listCode = fs.readFileSync(LIST_PATH, "utf8");

  // Grouping support
  assert.ok(
    listCode.includes('groupBy === "department"') &&
      listCode.includes('groupBy === "status"') &&
      listCode.includes('groupBy === "none"'),
    "Must support department, status, and flat none grouping"
  );

  // Formatting and Badges
  assert.ok(
    listCode.includes("formatTransactionId"),
    "Must format transaction IDs (ODRS-xxx, OSAS-xxx)"
  );
  assert.ok(
    !listCode.includes("`#ODRS-") && !listCode.includes("`#OSAS-"),
    "Must not include leading # in transaction IDs"
  );
  assert.ok(
    listCode.includes("getRequestCharterStatus"),
    "Must evaluate transaction SLA with getRequestCharterStatus"
  );
  assert.ok(
    listCode.includes("Registrar") && listCode.includes("OSAS"),
    "Must display department badges"
  );
  assert.ok(
    listCode.includes("getDepartmentBadgeClass"),
    "Must export getDepartmentBadgeClass for uniform department badge colors"
  );
  const badgeStylesSrc = fs.readFileSync(BADGE_STYLES_PATH, "utf8");
  assert.ok(
    badgeStylesSrc.includes("text-[#800000]") && badgeStylesSrc.includes("bg-[#800000]/10"),
    "Registrar badge must use explicit PUP Maroon #800000 to prevent role color leakage"
  );
  assert.ok(
    badgeStylesSrc.includes("bg-[#DBEAFE] text-[#1E40AF]"),
    "OSAS badge must use the campus operations blue palette"
  );

  // Relative timestamp rendering safety
  assert.ok(
    listCode.includes("rel.relative || rel.date"),
    "Relative time must safely extract relative or date string and not render the raw object"
  );
  assert.ok(
    !listCode.includes("{formatRelativeTime("),
    "Must not render raw formatRelativeTime object as JSX child"
  );

  // Text-only badges (no icons in badges)
  assert.ok(
    !listCode.includes("<Certificate01Icon") && !listCode.includes("<Timer01Icon"),
    "Badges in list must be text-only without leading icons"
  );
  assert.ok(
    !listCode.includes("w-1.5 h-1.5 rounded-full"),
    "Badges in list must not contain decorative dot indicators"
  );

  // Table Row Density alignment across list rows
  assert.ok(
    listCode.includes("useTablePreferences") &&
      listCode.includes("getListDensityClasses") &&
      listCode.includes("densityClasses.minHeight"),
    "List row must consume useTablePreferences and getListDensityClasses for unified row density"
  );

  // Action buttons
  assert.ok(
    listCode.includes("View Details"),
    "Must provide View Details action"
  );
  assert.ok(
    listCode.includes("Preview PDF"),
    "Must provide Preview PDF action for records with attachments"
  );
});

test("Campus Operations PDF and CSV export utilities", () => {
  const pdfGenCode = fs.readFileSync(PDF_GEN_PATH, "utf8");

  // PDF generator export
  assert.ok(
    pdfGenCode.includes("export async function generateCampusOperationsPdf"),
    "pdfGenerator.js must export generateCampusOperationsPdf"
  );
  assert.ok(
    pdfGenCode.includes("Campus Operations & Turnaround Standards Report"),
    "PDF title must be Campus Operations & Turnaround Standards Report"
  );
  assert.ok(
    pdfGenCode.includes("orientation: \"landscape\""),
    "PDF must use landscape orientation for broad tabular telemetry"
  );
  assert.ok(
    !pdfGenCode.includes("3: { cellWidth: 120 }"),
    "Document/proposal title column must not be clamped to 120pt, allowing it to expand across full usable width"
  );

  const reportDocPath = path.resolve(__dirname, "../src/lib/reportDocument.js");
  const reportDocCode = fs.readFileSync(reportDocPath, "utf8");
  assert.ok(
    reportDocCode.includes("tableWidth: usable"),
    "reportDocument.js table must specify tableWidth: usable to ensure full width usage"
  );
  assert.ok(
    reportDocCode.includes("widestIndex"),
    "reportDocument.js must provide full-width safeguard to prevent right-side gap when all columns are fixed"
  );

  // SLA Calculation Accuracy
  const tiers = buildSlaTiers(DEFAULT_SLA_STANDARDS);
  assert.strictEqual(tiers.SIMPLE.days, 3);
  assert.strictEqual(tiers.COMPLEX.days, 7);
  assert.strictEqual(tiers.HIGHLY_TECHNICAL.days, 20);

  const onTrackReq = getRequestCharterStatus({
    doc_type: "Transcript of Records",
    status: "Pending",
    created_at: new Date().toISOString(),
  });
  assert.strictEqual(onTrackReq.status, "OnTrack");
  assert.strictEqual(onTrackReq.isOverdue, false);

  const overdueReq = getRequestCharterStatus({
    doc_type: "Certificate of Enrollment",
    status: "Pending",
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  });
  assert.strictEqual(overdueReq.status, "Overdue");
  assert.strictEqual(overdueReq.isOverdue, true);
});

test("Standardized borderless badge system and uniform geometry", () => {
  assert.ok(fs.existsSync(BADGE_STYLES_PATH), "badgeStyles.js must exist");
  const badgeStylesCode = fs.readFileSync(BADGE_STYLES_PATH, "utf8");

  // Uniform geometry: rounded-full and px-2.5 py-0.5
  assert.ok(
    badgeStylesCode.includes("rounded-full") &&
      badgeStylesCode.includes("px-2.5 py-0.5") &&
      badgeStylesCode.includes("BADGE_BASE"),
    "BADGE_BASE must standardize rounded-full and px-2.5 py-0.5"
  );

  // Pool of borderless colors
  assert.ok(badgeStylesCode.includes("BADGE_PALETTES"), "Must export BADGE_PALETTES");
  assert.ok(
    !badgeStylesCode.includes("border border-"),
    "BADGE_PALETTES must not contain border line color styles"
  );
  assert.ok(
    badgeStylesCode.includes("maroon") &&
      badgeStylesCode.includes("blue") &&
      badgeStylesCode.includes("amber") &&
      badgeStylesCode.includes("emerald") &&
      badgeStylesCode.includes("rose") &&
      badgeStylesCode.includes("gray"),
    "BADGE_PALETTES must contain maroon, blue, amber, emerald, rose, and gray"
  );

  // Components using BADGE_BASE
  const listCode = fs.readFileSync(LIST_PATH, "utf8");
  const tabCode = fs.readFileSync(TAB_PATH, "utf8");
  assert.ok(listCode.includes("BADGE_BASE"), "CampusOperationsList must use BADGE_BASE");
  assert.ok(tabCode.includes("BADGE_BASE"), "CampusOperationsTab must use BADGE_BASE");

  // ServiceStandardsSheet badge borderlessness and simple terminology
  assert.ok(fs.existsSync(SHEET_PATH), "ServiceStandardsSheet.js must exist");
  const sheetCode = fs.readFileSync(SHEET_PATH, "utf8");
  assert.ok(
    sheetCode.includes("BADGE_BASE") && sheetCode.includes("BADGE_PALETTES"),
    "ServiceStandardsSheet must import and use BADGE_BASE and BADGE_PALETTES"
  );
  assert.ok(
    sheetCode.includes("Processing Time Standards"),
    "ServiceStandardsSheet title must use simple terminology (Processing Time Standards)"
  );
  assert.ok(
    sheetCode.includes("Processing Days by Request Type"),
    "ServiceStandardsSheet must use simple section title (Processing Days by Request Type)"
  );
  assert.ok(
    sheetCode.includes("Estimated Completion Dates"),
    "ServiceStandardsSheet must use simple simulation title (Estimated Completion Dates)"
  );
  assert.ok(
    !sheetCode.includes("border-emerald-200/50") &&
      !sheetCode.includes("border-amber-200/50") &&
      !sheetCode.includes("border-purple-200/50"),
    "ServiceStandardsSheet tier badges must not have border line styling"
  );

  // CampusOperationsTab banner simplified text
  assert.ok(
    tabCode.includes("Target processing deadlines and on-time completion rates"),
    "CampusOperationsTab banner must use simplified, intuitive language"
  );
});

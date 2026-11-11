import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

test("Document Checklist (StudentComplianceTab): Group by 'No grouping' is the last choice", () => {
  const filePath = path.join(ROOT_DIR, "src/components/student/StudentComplianceTab.js");
  const content = fs.readFileSync(filePath, "utf-8");

  // Verify groupOptions definition has 'none' as the last option
  const groupOptionsMatch = content.match(/const groupOptions = useMemo\(\(\) => \[([\s\S]*?)\]/);
  assert.ok(groupOptionsMatch, "groupOptions should be defined with useMemo");

  const items = groupOptionsMatch[1]
    .split("},")
    .map((s) => s.trim())
    .filter(Boolean);
  const lastItem = items[items.length - 1];
  assert.ok(
    lastItem.includes('"none"') || lastItem.includes("'none'"),
    `Expected 'none' to be the last item in groupOptions, found: ${lastItem}`
  );
  assert.ok(
    lastItem.includes("No grouping"),
    `Expected 'No grouping' label on last item in groupOptions, found: ${lastItem}`
  );
});

test("Document Checklist (StudentComplianceTab): Uses List View instead of Table View and removes unnecessary controls", () => {
  const filePath = path.join(ROOT_DIR, "src/components/student/StudentComplianceTab.js");
  const content = fs.readFileSync(filePath, "utf-8");

  // Columns filter should NOT be present (no ColumnsPopover)
  assert.ok(
    !content.includes("<ColumnsPopover"),
    "ColumnsPopover should be removed from toolbar in List View"
  );
  assert.ok(
    !content.includes("from \"@/components/systemadmin/OfficeTableControls\";\nimport ColumnsPopover"),
    "ColumnsPopover should not be imported"
  );

  // Horizontal scroll controls should NOT be present (no TableScrollControls or useTableScroll)
  assert.ok(
    !content.includes("<TableScrollControls"),
    "TableScrollControls should be removed"
  );
  assert.ok(
    !content.includes("useTableScroll"),
    "useTableScroll should not be used"
  );

  // Table primitive should NOT be used
  assert.ok(
    !content.includes("from \"@/components/ui/table\""),
    "Table component should not be imported"
  );

  // Label 'Admission Credentials (... requirements)' banner should be removed
  assert.ok(
    !content.includes('aria-label="Student compliance view options"'),
    "Admission credentials view options banner should be removed"
  );
  assert.ok(
    !content.match(/Admission Credentials\s*\(.*requirements/i),
    "Admission credentials requirement count text should be removed"
  );

  // View mode switcher should include Grid and List as icon-only controls
  assert.ok(
    content.includes('value: "grid"'),
    "View switcher should have 'grid' option"
  );
  assert.ok(
    content.includes('value: "list"'),
    "View switcher should have 'list' option"
  );
  assert.ok(
    content.includes('ariaLabel: "List View"') || content.includes('title: "List View"'),
    "View switcher should have accessible title/ariaLabel for icon buttons"
  );

  // SuperAdmin-inspired List View styling
  assert.ok(
    content.includes("useTablePreferences"),
    "List view should use table preferences density"
  );
  assert.ok(
    content.includes("getListDensityClasses"),
    "List view should use getListDensityClasses"
  );
  assert.ok(
    content.includes("ArrowDown01Icon"),
    "List view should support collapsible groups with ArrowDown01Icon"
  );
});

test("Document Checklist (StudentComplianceTab): Action button in rows is an icon button with table-action-button", () => {
  const filePath = path.join(ROOT_DIR, "src/components/student/StudentComplianceTab.js");
  const content = fs.readFileSync(filePath, "utf-8");

  // Verify table-action-button class is used
  assert.ok(
    content.includes("table-action-button"),
    "Action button must use the table-action-button class"
  );
  assert.ok(
    content.includes("<ViewIcon"),
    "Action button must render ViewIcon"
  );
  // Verify it doesn't render "View Details" text directly inside the Button
  assert.ok(
    !content.includes(">View Details</Button>"),
    "Action button should not be a text button displaying 'View Details'"
  );
  // Verify Tooltip is provided
  assert.ok(
    content.includes("<TooltipContent>View Details</TooltipContent>"),
    "Action icon button must have a Tooltip displaying 'View Details'"
  );
});

test("Document Checklist (StudentComplianceTab & PDFPreviewModal): Admission Credentials Checklist preview is properly hooked up", () => {
  const tabContent = fs.readFileSync(path.join(ROOT_DIR, "src/components/student/StudentComplianceTab.js"), "utf-8");
  const modalContent = fs.readFileSync(path.join(ROOT_DIR, "src/components/shared/PDFPreviewModal.js"), "utf-8");
  const sheetContent = fs.readFileSync(path.join(ROOT_DIR, "src/components/student/PermanentAdmissionRecordSheet.js"), "utf-8");

  // 1. Tab uses usePdfPreviewSession for slip preview
  assert.ok(
    tabContent.includes("usePdfPreviewSession"),
    "StudentComplianceTab should use usePdfPreviewSession"
  );
  assert.ok(
    tabContent.includes("handlePreviewPdf"),
    "StudentComplianceTab should have handlePreviewPdf"
  );
  assert.ok(
    tabContent.includes("pdfUrl={pdfPreviewUrl}"),
    "StudentComplianceTab should pass pdfUrl to PDFPreviewModal"
  );

  // 2. PDFPreviewModal supports pdfGenerator fallback natively
  assert.ok(
    modalContent.includes("pdfGenerator"),
    "PDFPreviewModal should accept and support pdfGenerator"
  );

  // 3. PermanentAdmissionRecordSheet supports requirement or item
  assert.ok(
    sheetContent.includes("itemProp || requirement"),
    "PermanentAdmissionRecordSheet should support both item and requirement props"
  );

  // 4. Tab passes item and onPreviewDocument to PermanentAdmissionRecordSheet
  assert.ok(
    tabContent.includes("item={selectedRequirement}"),
    "StudentComplianceTab should pass item={selectedRequirement}"
  );
  assert.ok(
    tabContent.includes("onPreviewDocument="),
    "StudentComplianceTab should provide onPreviewDocument"
  );
});

test("Document Checklist (PDF Generator): generateStudentComplianceSlipPdf does not include Category column", () => {
  const pdfGenContent = fs.readFileSync(path.join(ROOT_DIR, "src/lib/pdfGenerator.js"), "utf-8");
  assert.ok(
    pdfGenContent.includes('report.table(["Requirement / Credential", "Status"]'),
    "generateStudentComplianceSlipPdf table should only have Requirement / Credential and Status columns (no Category)"
  );
  assert.ok(
    !pdfGenContent.includes('report.table(["Requirement / Credential", "Category", "Status"]'),
    "generateStudentComplianceSlipPdf should not have Category column in its table"
  );
});

test("Document Checklist (Description Formatting): Uses NarrativeText to style requirement descriptions", () => {
  const tabContent = fs.readFileSync(path.join(ROOT_DIR, "src/components/student/StudentComplianceTab.js"), "utf-8");
  const sheetContent = fs.readFileSync(path.join(ROOT_DIR, "src/components/student/PermanentAdmissionRecordSheet.js"), "utf-8");

  assert.ok(
    tabContent.includes("NarrativeText"),
    "StudentComplianceTab should import and use NarrativeText for descriptions"
  );
  assert.ok(
    tabContent.includes("<NarrativeText text={item.description} mode=\"compact\" />"),
    "StudentComplianceTab list view should render description via NarrativeText in compact mode"
  );
  assert.ok(
    tabContent.includes("<NarrativeText text={item.description} mode=\"full\" />"),
    "StudentComplianceTab list view should provide full NarrativeText in tooltip"
  );
  assert.ok(
    sheetContent.includes("<NarrativeText text={docDescription} mode=\"full\" />"),
    "PermanentAdmissionRecordSheet should render docDescription with NarrativeText"
  );
});

test("Narrative Formatter Integration: Overview, Document Requests, and OSAS Submissions", () => {
  const overviewContent = fs.readFileSync(path.join(ROOT_DIR, "src/components/student/StudentOverviewTab.js"), "utf-8");
  const studentPageContent = fs.readFileSync(path.join(ROOT_DIR, "src/app/student/page.js"), "utf-8");
  const requestSheetContent = fs.readFileSync(path.join(ROOT_DIR, "src/components/staff/requests/DocumentRequestDetailSheet.js"), "utf-8");
  const osasSheetContent = fs.readFileSync(path.join(ROOT_DIR, "src/components/staff/osas/OsasProposalReviewSheet.js"), "utf-8");

  // 1. Overview Tab
  assert.ok(overviewContent.includes("NarrativeText"), "StudentOverviewTab should import NarrativeText");
  assert.ok(overviewContent.includes("<NarrativeText text={event.description} mode=\"full\" />"), "Overview recent activities should use NarrativeText");
  assert.ok(overviewContent.includes("<NarrativeText text={item.description} mode=\"full\" />"), "Overview action items should use NarrativeText");

  // 2. Student Portal Page (Document Requests & OSAS)
  assert.ok(studentPageContent.includes("NarrativeText"), "student/page.js should import NarrativeText");
  assert.ok(studentPageContent.includes("<NarrativeText text={item.notes} mode=\"compact\" />"), "Requests table should render notes with NarrativeText in compact mode");
  assert.ok(studentPageContent.includes("<NarrativeText text={selectedRequestForDetail.notes} mode=\"full\" />"), "Request detail sheet should render notes with NarrativeText in full mode");
  assert.ok(studentPageContent.includes("<NarrativeText text={latestUpdate.message || \"Status updated by OSAS\"} mode=\"compact\" />"), "Proposals list should render latest update with NarrativeText");
  assert.ok(studentPageContent.includes("<NarrativeText text={report.review_note} mode=\"compact\" />"), "Post-event list should render OSAS review note with NarrativeText");
  assert.ok(studentPageContent.includes('<NarrativeText text={ver.review_notes} mode="compact" />'), "CBL cards should format actionable review feedback");
  assert.ok(studentPageContent.includes('ver.status === "Needs Revision" || ver.status === "Declined"'), "CBL cards should surface feedback that needs attention");
  assert.ok(studentPageContent.includes('<NarrativeText text={selectedCblVersionForDetail.review_notes} mode="full" />'), "CBL details should retain full review feedback");

  // 3. Staff Request & OSAS Sheets
  assert.ok(requestSheetContent.includes("NarrativeText"), "DocumentRequestDetailSheet should import NarrativeText");
  assert.ok(requestSheetContent.includes("<NarrativeText text={detail.notes} mode=\"full\" />"), "DocumentRequestDetailSheet should format stated purpose");
  assert.ok(osasSheetContent.includes("NarrativeText"), "OsasProposalReviewSheet should import NarrativeText");
  assert.ok(osasSheetContent.includes("<NarrativeText text={update.message} mode=\"full\" />"), "OsasProposalReviewSheet should format update messages");
});

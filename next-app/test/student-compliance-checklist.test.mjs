import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

test("Checklist uses the list by default and offers No grouping last", () => {
  const tab = fs.readFileSync(path.join(ROOT_DIR, "src/components/student/StudentComplianceTab.js"), "utf-8");
  assert.match(tab, /const groupOptions = \[.*?value: "none", label: "No grouping" \},\s*\];/s);
  assert.match(tab, /useWorkspaceViewPreference\("student_compliance", "viewMode", "list", \{ user: authUser \}\)/);
  assert.doesNotMatch(tab, /<ColumnsPopover|<DateRangeFilterButton|<Table[ >]/);
});

test("Checklist opens verification and renders status without file controls", () => {
  const tab = fs.readFileSync(path.join(ROOT_DIR, "src/components/student/StudentComplianceTab.js"), "utf-8");
  assert.match(tab, /Add Student Number/);
  assert.match(tab, /<EditChecklistStudentNumberDialog/);
  assert.match(tab, /item.status/);
  assert.match(tab, /<PermanentAdmissionRecordSheet[\s\S]*?statusOnly/);
  assert.doesNotMatch(tab, /PDFPreviewModal|onPreviewDocument|fileUrl|originalFilename/);
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

test("Narrative Formatter Integration: Overview, Document Requests, and OSAS Submissions", () => {
  const overviewContent = fs.readFileSync(path.join(ROOT_DIR, "src/components/student/StudentOverviewTab.js"), "utf-8");
  const studentPageContent = fs.readFileSync(path.join(ROOT_DIR, "src/app/student/page.js"), "utf-8");
  const requestSheetContent = fs.readFileSync(path.join(ROOT_DIR, "src/components/staff/requests/DocumentRequestDetailSheet.js"), "utf-8");
  const osasSheetContent = fs.readFileSync(path.join(ROOT_DIR, "src/components/staff/osas/OsasProposalReviewSheet.js"), "utf-8");

  // 1. Overview Tab
  assert.ok(overviewContent.includes("NarrativeText"), "StudentOverviewTab should import NarrativeText");
  assert.ok(overviewContent.includes("<NarrativeText text={event.description} mode=\"full\" />"), "Overview recent activities should use NarrativeText");
  assert.ok(overviewContent.includes("<NarrativeText text={item.description} mode=\"full\" highlightedPhrases={item.highlightedPhrases} />"), "Overview action items should emphasize document names with NarrativeText");

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

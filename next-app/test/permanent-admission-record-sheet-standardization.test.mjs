import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..");

test("Permanent Admission Record Sheet standardization & cognitive reduction", () => {
  const sheetPath = path.join(ROOT_DIR, "src/components/student/PermanentAdmissionRecordSheet.js");
  assert.ok(fs.existsSync(sheetPath), "PermanentAdmissionRecordSheet.js must exist");

  const sheetCode = fs.readFileSync(sheetPath, "utf8");

  // Check Sheet primitives
  assert.ok(sheetCode.includes("SheetContent"), "Must use SheetContent");
  assert.ok(sheetCode.includes("SheetHeader"), "Must use SheetHeader");
  assert.ok(sheetCode.includes("SheetTitle"), "Must use SheetTitle");
  assert.ok(sheetCode.includes("SheetFooter"), "Must use SheetFooter");

  // Check SheetHeader hygiene (no icon box in SheetHeader, clean typography)
  const headerMatch = sheetCode.match(/<SheetHeader[\s\S]*?<\/SheetHeader>/);
  assert.ok(headerMatch, "SheetHeader must be present");
  const headerContent = headerMatch[0];
  assert.ok(
    !headerContent.includes("<HugeIcon") || headerContent.includes("ph-caret-left") || headerContent.includes("ph-x"),
    "SheetHeader must not contain decorative icon boxes; only nav carets and close X are allowed"
  );

  // Check Edge-to-Edge Line-Attached Status Notice (Component Standard 6)
  assert.ok(
    sheetCode.includes("border-b") && (sheetCode.includes("Archived & Verified:") || sheetCode.includes("Action Required:")),
    "Must feature line-attached status notice attached directly under header"
  );

  // Check Cognitive Reduction: Eliminates redundant student demographic echoing and internal cabinet coordinates
  assert.ok(
    !sheetCode.includes('label="Student Name"'),
    "Must NOT echo redundant Student Name back to the logged-in student"
  );
  assert.ok(
    !sheetCode.includes('label="Student Number"'),
    "Must NOT echo redundant Student Number back to the logged-in student"
  );
  assert.ok(
    !sheetCode.includes('label="Academic Program"'),
    "Must NOT echo redundant Academic Program back to the logged-in student"
  );
  assert.ok(
    !sheetCode.includes('label="Institutional Vault"'),
    "Must NOT expose internal registrar cabinet/drawer coordinates to students"
  );

  // Check Card Reduction: Avoids nested card-in-card containers
  assert.ok(
    !sheetCode.includes("rounded-2xl bg-gray-50/60"),
    "Must reduce boxed card containers in favor of unboxed typographic layout"
  );

  // Check Essential Specification InfoRows
  assert.ok(sheetCode.includes("function InfoRow"), "Must implement standard InfoRow layout");
  assert.ok(sheetCode.includes("Record Specification"), "Must contain Record Specification section");
  assert.ok(sheetCode.includes("Verifying Office"), "Must include Verifying Office row");
  assert.ok(sheetCode.includes("Clearance Status"), "Must include Clearance Status row");

  // Check sequential navigation
  assert.ok(sheetCode.includes("onNavigatePrev"), "Must support onNavigatePrev");
  assert.ok(sheetCode.includes("onNavigateNext"), "Must support onNavigateNext");

  // Check action-only Close button in SheetFooter
  assert.ok(
    sheetCode.includes("<Button") && sheetCode.includes("Close") && sheetCode.includes("SheetFooter"),
    "Must feature clean action-only Close button in SheetFooter"
  );
});

test("StudentOverviewTab delegates to PermanentAdmissionRecordSheet and standardizes Post-Event Liquidation Sheet", () => {
  const tabPath = path.join(ROOT_DIR, "src/components/student/StudentOverviewTab.js");
  assert.ok(fs.existsSync(tabPath));

  const tabCode = fs.readFileSync(tabPath, "utf8");
  assert.ok(
    tabCode.includes("PermanentAdmissionRecordSheet"),
    "StudentOverviewTab must import and render PermanentAdmissionRecordSheet"
  );
  assert.ok(
    tabCode.includes("selectedComplianceDetail"),
    "StudentOverviewTab must bind selectedComplianceDetail to PermanentAdmissionRecordSheet"
  );

  // Post-Event Liquidation Details Sheet standards
  assert.ok(
    tabCode.includes("Post-Event Liquidation Details"),
    "StudentOverviewTab must feature Post-Event Liquidation Details sheet"
  );
  assert.ok(
    tabCode.includes("Liquidation Cleared:") || tabCode.includes("Report Submitted:"),
    "Post-Event Liquidation Sheet must feature line-attached status notice"
  );
  assert.ok(
    !tabCode.includes("rounded-2xl bg-gray-50/60 dark:bg-zinc-900/40 p-4 border border-border/80 space-y-3"),
    "Post-Event Liquidation Sheet must NOT wrap attached documents in outer card containers"
  );
});

test("StudentComplianceTab delegates to PermanentAdmissionRecordSheet and supports interactive row/card inspection", () => {
  const tabPath = path.join(ROOT_DIR, "src/components/student/StudentComplianceTab.js");
  assert.ok(fs.existsSync(tabPath));

  const tabCode = fs.readFileSync(tabPath, "utf8");
  assert.ok(
    tabCode.includes("PermanentAdmissionRecordSheet"),
    "StudentComplianceTab must import and render PermanentAdmissionRecordSheet"
  );
  assert.ok(
    tabCode.includes("selectedRequirement"),
    "StudentComplianceTab must maintain selectedRequirement state for the sheet"
  );
  assert.ok(
    tabCode.includes("onClick={() => setSelectedRequirement(item)}"),
    "StudentComplianceTab must allow clicking requirements to open the details sheet"
  );
  assert.ok(
    tabCode.includes("View Details"),
    "StudentComplianceTab must include accessible View Details triggers"
  );
});

test("Student Portal Page standardizes Document Request Details Sheet and OSAS Event Proposal Sheet", () => {
  const pagePath = path.join(ROOT_DIR, "src/app/student/page.js");
  assert.ok(fs.existsSync(pagePath));

  const pageCode = fs.readFileSync(pagePath, "utf8");

  // 1. Document Request Details Sheet
  assert.ok(
    pageCode.includes("Document Request Details"),
    "Must feature Document Request Details sheet"
  );
  assert.ok(
    pageCode.includes("Ready for Claiming:") && pageCode.includes("Payment Slip Required:"),
    "Document Request Details sheet must feature edge-to-edge line-attached status banner"
  );
  assert.ok(
    !pageCode.includes('label="Requester"'),
    "Document Request Details sheet must NOT echo redundant Requester name back to the student"
  );
  assert.ok(
    !pageCode.includes('label="Program / Course"'),
    "Document Request Details sheet must NOT echo redundant Program back to the student"
  );

  // 2. OSAS Event Proposal Details Sheet
  assert.ok(
    pageCode.includes("Event Proposal Details"),
    "Must feature Event Proposal Details sheet"
  );
  assert.ok(
    pageCode.includes("Proposal Sanctioned:") && pageCode.includes("Revision Required:"),
    "OSAS Event Proposal sheet must feature edge-to-edge line-attached status banner"
  );
  assert.ok(
    !pageCode.includes("rounded-2xl bg-gray-50/60 dark:bg-zinc-900/40 p-4 border border-border/80"),
    "OSAS Event Proposal sheet must NOT use bulky outer card wrappers for attached proposal document"
  );
});

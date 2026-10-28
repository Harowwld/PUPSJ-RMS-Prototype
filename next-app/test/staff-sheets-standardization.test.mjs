import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..");

test("StudentProfileSheet standardization & cognitive reduction", () => {
  const sheetPath = path.join(ROOT_DIR, "src/components/staff/StudentProfileSheet.js");
  assert.ok(fs.existsSync(sheetPath), "StudentProfileSheet.js must exist");

  const code = fs.readFileSync(sheetPath, "utf8");

  // Header hygiene: SheetTitle, pagination, sr-only description
  assert.ok(code.includes("<SheetHeader"), "Must have SheetHeader");
  assert.ok(code.includes("Student Details") && code.includes("Organization Details"), "Must feature clean dynamic SheetTitle");
  assert.ok(code.includes('className="sr-only"'), "Must feature accessible sr-only description");
  assert.ok(code.includes("onNavigatePrev") && code.includes("onNavigateNext"), "Must support sequential navigation");

  // Edge-to-edge line-attached status notice (Archived Record vs Active Archive Profile)
  assert.ok(
    code.includes("Archived Record:") && code.includes("Active Archive Profile:"),
    "Must feature edge-to-edge line-attached status notice"
  );
  assert.ok(
    code.includes("border-amber-200") && code.includes("border-emerald-200"),
    "Line-attached notice must have edge-to-edge border-b styling without outer card margins"
  );

  // Card reduction: Unboxed profile summary strip
  assert.ok(
    !code.includes("rounded-2xl border border-border/80 bg-gray-50/60 p-4"),
    "Must NOT wrap profile summary strip in heavy outer card container"
  );
  assert.ok(
    code.includes("pb-4 border-b border-border/80"),
    "Profile summary strip must be unboxed with clean hairline border-b divider"
  );

  // Streamlined physical coordinates (no redundant 4-row coordinates breakdown)
  assert.ok(code.includes('label="Archive Vault"'), "Must include Archive Vault coordinate row");
  assert.ok(code.includes('label="Cabinet & Drawer"'), "Must include Cabinet & Drawer coordinate row");
  assert.ok(
    !code.includes('label="Physical Room"') && !code.includes('label="Archive Cabinet"'),
    "Must NOT separate room, cabinet, and drawer into 3 redundant duplicate rows"
  );

  // SheetFooter standards
  assert.ok(code.includes("<SheetFooter"), "Must have SheetFooter");
  assert.ok(code.includes("variant=\"outline\""), "Dismiss button must be outlined");
  assert.ok(code.includes("Close"), "Must have clean Close button");
});

test("DocumentRequestDetailSheet standardization & cognitive reduction", () => {
  const sheetPath = path.join(ROOT_DIR, "src/components/staff/requests/DocumentRequestDetailSheet.js");
  assert.ok(fs.existsSync(sheetPath), "DocumentRequestDetailSheet.js must exist");

  const code = fs.readFileSync(sheetPath, "utf8");

  // Header hygiene
  assert.ok(code.includes("<SheetHeader"), "Must have SheetHeader");
  assert.ok(code.includes("Request Details"), "Must feature standard SheetTitle");
  assert.ok(code.includes('className="sr-only"'), "Must feature sr-only description");

  // Edge-to-edge line-attached status notice
  assert.ok(
    code.includes("Ready for Claiming:") &&
    code.includes("Payment Required:") &&
    code.includes("Deficiency Notice:") &&
    code.includes("Fulfillment In Progress:"),
    "Must feature comprehensive line-attached status notices"
  );

  // Card reduction: Unboxed profile summary strip
  assert.ok(
    !code.includes("rounded-2xl border border-border/80 bg-gray-50/60 p-4"),
    "Must NOT wrap profile summary in outer card container"
  );
  assert.ok(
    code.includes("pb-4 border-b border-border/80"),
    "Summary strip must be unboxed with border-b hairline divider"
  );

  // SheetFooter standards
  assert.ok(code.includes("<SheetFooter"), "Must have SheetFooter");
  assert.ok(code.includes("variant=\"outline\""), "Dismiss button must be outlined");
});

test("OsasProposalReviewSheet standardization & cognitive reduction", () => {
  const sheetPath = path.join(ROOT_DIR, "src/components/staff/osas/OsasProposalReviewSheet.js");
  assert.ok(fs.existsSync(sheetPath), "OsasProposalReviewSheet.js must exist");

  const code = fs.readFileSync(sheetPath, "utf8");

  // Header hygiene
  assert.ok(code.includes("<SheetHeader"), "Must have SheetHeader");
  assert.ok(code.includes("Event Proposal Details"), "Must feature clean SheetTitle");
  assert.ok(code.includes('className="sr-only"'), "Must feature sr-only description");

  // Edge-to-edge line-attached status notice
  assert.ok(
    code.includes("Proposal Sanctioned:") &&
    code.includes("Revision Requested:") &&
    code.includes("Proposal Declined:") &&
    code.includes("Under Evaluation:"),
    "Must feature edge-to-edge line-attached operational notices"
  );

  // Card reduction: Unboxed narrative
  assert.ok(
    !code.includes("rounded-2xl border border-border/80 bg-gray-50/50 dark:bg-zinc-800/40 p-4 space-y-2"),
    "Must NOT wrap proposal description and objectives in heavy outer card"
  );
  assert.ok(
    code.includes("Event Description & Objectives"),
    "Proposal description must be an unboxed narrative section"
  );

  // SheetFooter standards
  assert.ok(code.includes("<SheetFooter"), "Must have SheetFooter");
  assert.ok(code.includes("variant=\"outline\""), "Dismiss action must be outlined");
});

test("OsasPostEventReviewSheet standardization & cognitive reduction", () => {
  const sheetPath = path.join(ROOT_DIR, "src/components/staff/osas/OsasPostEventReviewSheet.js");
  assert.ok(fs.existsSync(sheetPath), "OsasPostEventReviewSheet.js must exist");

  const code = fs.readFileSync(sheetPath, "utf8");

  // Header hygiene
  assert.ok(code.includes("<SheetHeader"), "Must have SheetHeader");
  assert.ok(code.includes("Post-Event Clearance Details"), "Must feature clean SheetTitle");
  assert.ok(code.includes('className="sr-only"'), "Must feature sr-only description");

  // Edge-to-edge line-attached status notice
  assert.ok(
    code.includes("Liquidation Cleared:") &&
    code.includes("Revision Required:") &&
    code.includes("Liquidation Rejected:") &&
    code.includes("Under Financial Review:"),
    "Must feature edge-to-edge line-attached operational notices"
  );

  // Card reduction: Unboxed narrative
  assert.ok(
    !code.includes("rounded-2xl border border-border/80 bg-gray-50/50 dark:bg-zinc-800/40 p-4 space-y-2"),
    "Must NOT wrap accomplishment narrative in heavy outer card container"
  );
  assert.ok(
    code.includes("Accomplishment & Narrative Summary"),
    "Accomplishment narrative must be unboxed"
  );

  // SheetFooter standards
  assert.ok(code.includes("<SheetFooter"), "Must have SheetFooter");
  assert.ok(code.includes("variant=\"outline\""), "Dismiss action must be outlined");
});

test("StudentOrganizationsTab slide-over sheet standardization & card reduction", () => {
  const tabPath = path.join(ROOT_DIR, "src/components/staff/StudentOrganizationsTab.js");
  assert.ok(fs.existsSync(tabPath), "StudentOrganizationsTab.js must exist");

  const code = fs.readFileSync(tabPath, "utf8");

  // Header hygiene
  assert.ok(code.includes("Manage Organization"), "Must feature clean SheetTitle");
  assert.ok(code.includes('className="sr-only"'), "Must feature sr-only description");

  // Line-attached notice for Archived or Inactive status
  assert.ok(
    code.includes("Archived Organization:") && code.includes("Inactive Accreditation:"),
    "Must feature line-attached status notices for Archived and Inactive states"
  );

  // Card reduction: Unboxed info form and authorize officer section
  assert.ok(
    !code.includes("rounded-2xl border border-border/80 dark:border-border bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-2xs"),
    "Must NOT wrap organization info form in outer card"
  );
  assert.ok(
    !code.includes("rounded-2xl border border-border/80 dark:border-border bg-gray-50/50 dark:bg-zinc-800/40 p-4 space-y-3"),
    "Must NOT wrap authorize officer form in outer card"
  );

  // Button standards: [Action Verb] + [Specific Noun]
  assert.ok(code.includes("Authorize Officer"), "Must use standard button label 'Authorize Officer'");
  assert.ok(code.includes("Archive Charter"), "Must use standard button label 'Archive Charter'");
});

test("NotificationsTab sliding sheet hygiene and unboxed layout", () => {
  const tabPath = path.join(ROOT_DIR, "src/components/staff/NotificationsTab.js");
  assert.ok(fs.existsSync(tabPath), "NotificationsTab.js must exist");

  const code = fs.readFileSync(tabPath, "utf8");

  // Header hygiene
  assert.ok(code.includes("Notification Details"), "Must feature clean SheetTitle");
  assert.ok(code.includes('className="sr-only"'), "Must feature sr-only description");
  assert.ok(code.includes("selectedNotifIndex"), "Must support sequential navigation");

  // Unboxed layout
  assert.ok(
    code.includes("pb-4 border-b border-border/80"),
    "Event summary strip must be unboxed with border-b divider"
  );
  assert.ok(code.includes("Notification Specification"), "Must contain specification section");
  assert.ok(code.includes("<SheetFooter"), "Must feature SheetFooter");
});

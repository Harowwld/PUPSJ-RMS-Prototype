import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..");

test("DigitizationComplianceTab slide-over sheet standardization & cognitive reduction", () => {
  const tabPath = path.join(ROOT_DIR, "src/components/admin/DigitizationComplianceTab.js");
  assert.ok(fs.existsSync(tabPath), "DigitizationComplianceTab.js must exist");

  const code = fs.readFileSync(tabPath, "utf8");
  assert.ok(code.includes("<ComplianceStudentsSheet"), "Must delegate to ComplianceStudentsSheet");

  const sheetPath = path.join(ROOT_DIR, "src/components/shared/ComplianceStudentsSheet.js");
  assert.ok(fs.existsSync(sheetPath), "ComplianceStudentsSheet.js must exist");
  const sheetCode = fs.readFileSync(sheetPath, "utf8");

  // Header hygiene
  assert.ok(sheetCode.includes("<SheetHeader"), "Must contain SheetHeader");
  assert.ok(sheetCode.includes("Incomplete Records"), "Must feature clean SheetTitle");

  // Footer standards
  assert.ok(sheetCode.includes("<SheetFooter"), "Must feature SheetFooter");
  assert.ok(sheetCode.includes('variant="outline"'), "Dismiss button must be outlined");
  assert.ok(sheetCode.includes("Close"), "Must feature Close button");
});

test("OSASOrganizationComplianceView slide-over sheet standardization & cognitive reduction", () => {
  const tabPath = path.join(ROOT_DIR, "src/components/admin/OSASOrganizationComplianceView.js");
  assert.ok(fs.existsSync(tabPath), "OSASOrganizationComplianceView.js must exist");

  const code = fs.readFileSync(tabPath, "utf8");

  // Header hygiene
  assert.ok(code.includes("<SheetHeader"), "Must contain SheetHeader");
  assert.ok(code.includes("Organization Leadership Roster"), "Must feature clean SheetTitle");
  assert.ok(code.includes('className="sr-only"'), "Must feature accessible sr-only description");
  assert.ok(code.includes("handlePrevOrg") && code.includes("handleNextOrg"), "Must support sequential navigation");

  // Edge-to-edge line-attached status notice
  assert.ok(
    code.includes("Accredited Campus Organization:") &&
    code.includes("Inactive Accreditation:") &&
    code.includes("Archived Organization:"),
    "Must feature edge-to-edge line-attached status notices"
  );

  // Cognitive reduction: Streamlined standing specifications
  assert.ok(
    !code.includes('label="Organization"'),
    "Must NOT repeat redundant Organization title row in specifications"
  );
  assert.ok(code.includes('label="Category"'), "Must feature Category row");
  assert.ok(code.includes('label="Faculty Adviser"'), "Must feature Faculty Adviser row");
  assert.ok(code.includes('label="Accredited Officers"'), "Must feature Accredited Officers row");

  // Footer standards
  assert.ok(code.includes("<SheetFooter"), "Must feature SheetFooter");
  assert.ok(code.includes("variant=\"outline\""), "Dismiss button must be outlined");
  assert.ok(code.includes("Close"), "Must feature Close button");
});

test("LogDetailSheet standardization & card reduction", () => {
  const sheetPath = path.join(ROOT_DIR, "src/components/admin/audit-logs/LogDetailSheet.js");
  assert.ok(fs.existsSync(sheetPath), "LogDetailSheet.js must exist");

  const code = fs.readFileSync(sheetPath, "utf8");

  // Header hygiene
  assert.ok(code.includes("<SheetHeader"), "Must contain SheetHeader");
  assert.ok(code.includes("Audit Event Details"), "Must feature clean SheetTitle");
  assert.ok(code.includes('className="sr-only"'), "Must feature accessible sr-only description");
  assert.ok(code.includes("onPrev") && code.includes("onNext"), "Must support sequential navigation");

  // Edge-to-edge line-attached status notice
  assert.ok(
    code.includes("Audit Event:") || code.includes("Forensic Audit Log:"),
    "Must feature line-attached audit severity/integrity notice"
  );

  // Card reduction: Unboxed actor summary strip
  assert.ok(
    !code.includes("rounded-2xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-4 flex items-center justify-between gap-3 shadow-2xs"),
    "Must NOT wrap identity summary in boxed card container"
  );
  assert.ok(
    code.includes("flex items-center justify-between gap-3 pb-4 border-b border-border/80"),
    "Actor summary strip must be unboxed with border-b divider"
  );

  // Footer standards
  assert.ok(code.includes("<SheetFooter"), "Must feature SheetFooter");
  assert.ok(code.includes("variant=\"outline\""), "Dismiss button must be outlined");
  assert.ok(code.includes("Copy Record Data"), "Must feature standard Copy Record Data button");
  assert.ok(code.includes("Close"), "Must feature Close button");
});

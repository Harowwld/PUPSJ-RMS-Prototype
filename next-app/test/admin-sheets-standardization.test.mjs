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

  // Header hygiene
  assert.ok(code.includes("<SheetHeader"), "Must contain SheetHeader");
  assert.ok(code.includes("Compliance Deficiency Details"), "Must feature clean SheetTitle");
  assert.ok(code.includes('className="sr-only"'), "Must feature accessible sr-only description");
  assert.ok(code.includes("handleNavigatePrevDoc") && code.includes("handleNavigateNextDoc"), "Must support sequential navigation");

  // Edge-to-edge line-attached status notice
  assert.ok(
    code.includes("Full Compliance Achieved:") && code.includes("Compliance Deficiency Detected:"),
    "Must feature line-attached status notice for compliance states"
  );
  assert.ok(
    code.includes("border-b border-emerald-200") || code.includes("border-emerald-200/90"),
    "Notice must feature edge-to-edge line attachment with border-b"
  );

  // Card reduction: Unboxed summary strip
  assert.ok(
    !code.includes("p-6 bg-gradient-to-b from-gray-50/50 to-transparent"),
    "Must NOT use heavy gradient card containers for summary strip"
  );
  assert.ok(
    code.includes("p-6 pb-4 border-b border-border/80"),
    "Summary strip must be unboxed with border-b divider"
  );

  // Streamlined specification (no redundant Document Name echoing)
  assert.ok(
    !code.includes('label="Document Name"'),
    "Must NOT echo redundant Document Name row in specification"
  );
  assert.ok(code.includes('label="Total Enrolled"'), "Must feature Total Enrolled row");
  assert.ok(code.includes('label="Digitized Records"'), "Must feature Digitized Records row");
  assert.ok(code.includes('label="Deficiency Gap"'), "Must feature Deficiency Gap row");

  // Footer standards
  assert.ok(code.includes("<SheetFooter"), "Must feature SheetFooter");
  assert.ok(code.includes("variant=\"outline\""), "Dismiss button must be outlined");
  assert.ok(code.includes("Close"), "Must feature Close button");
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

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..");

test("GlobalStaffTab slide-over sheet standardization & card reduction", () => {
  const tabPath = path.join(ROOT_DIR, "src/components/systemadmin/GlobalStaffTab.js");
  assert.ok(fs.existsSync(tabPath), "GlobalStaffTab.js must exist");

  const code = fs.readFileSync(tabPath, "utf8");

  // Header hygiene
  assert.ok(code.includes("<SheetHeader"), "Must contain SheetHeader");
  assert.ok(code.includes("Personnel Details"), "Must feature clean SheetTitle");
  assert.ok(code.includes('className="sr-only"'), "Must feature accessible sr-only description");
  assert.ok(code.includes("hasPrevMember") && code.includes("hasNextMember"), "Must support sequential navigation");

  // Edge-to-edge line-attached status notice
  assert.ok(
    code.includes("Active Personnel Account:") && code.includes("Archived Personnel Account:"),
    "Must feature line-attached status notice for personnel states"
  );
  assert.ok(
    code.includes("border-emerald-200/90") && code.includes("border-amber-200/90"),
    "Notice must feature edge-to-edge line attachment with border-b"
  );

  // Card reduction: Unboxed identity summary strip
  assert.ok(
    code.includes("flex items-center justify-between gap-3 pb-4 border-b border-border/80"),
    "Identity summary strip must be unboxed with border-b divider"
  );
  assert.ok(
    !code.includes("rounded-2xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 flex items-center justify-between gap-3"),
    "Must NOT wrap status in outer card hero container"
  );

  // Footer standards
  assert.ok(code.includes("<SheetFooter"), "Must feature SheetFooter");
  assert.ok(code.includes("variant=\"outline\""), "Dismiss and action buttons must be outlined");
  assert.ok(code.includes("Close"), "Must feature Close button");
});

test("CampusOperationsTab slide-over sheet standardization & cognitive reduction", () => {
  const tabPath = path.join(ROOT_DIR, "src/components/systemadmin/CampusOperationsTab.js");
  assert.ok(fs.existsSync(tabPath), "CampusOperationsTab.js must exist");

  const code = fs.readFileSync(tabPath, "utf8");

  // Header hygiene
  assert.ok(code.includes("<SheetHeader"), "Must contain SheetHeader");
  assert.ok(code.includes("Operation Record Details"), "Must feature clean SheetTitle");
  assert.ok(code.includes('className="sr-only"'), "Must feature accessible sr-only description");
  assert.ok(code.includes("handlePrevTx") && code.includes("handleNextTx"), "Must support sequential navigation");

  // Edge-to-edge line-attached status notice
  assert.ok(
    code.includes("Completed Operation:") &&
    code.includes("Fulfillment In Progress:") &&
    code.includes("Operation Cancelled:") &&
    code.includes("Pending Operational Review:"),
    "Must feature edge-to-edge line-attached operational notices"
  );

  // Cognitive reduction: Streamlined specifications without duplicate student requester row
  assert.ok(code.includes('label="Student Number"'), "Must feature Student Number specification row");
  assert.ok(code.includes('label="Current Stage"'), "Must feature Current Stage row");

  // Card reduction: Unboxed Purpose & Remarks
  assert.ok(
    !code.includes("rounded-xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-3.5"),
    "Must NOT wrap remarks in heavy boxed card container"
  );

  // Footer standards
  assert.ok(code.includes("<SheetFooter"), "Must feature SheetFooter");
  assert.ok(code.includes("variant=\"outline\""), "Dismiss button must be outlined");
  assert.ok(code.includes("Close"), "Must feature Close button");
});

test("OfficeDetailSheet standardization & card reduction", () => {
  const sheetPath = path.join(ROOT_DIR, "src/components/systemadmin/OfficeDetailSheet.js");
  assert.ok(fs.existsSync(sheetPath), "OfficeDetailSheet.js must exist");

  const code = fs.readFileSync(sheetPath, "utf8");

  // Header hygiene
  assert.ok(code.includes("<SheetHeader"), "Must contain SheetHeader");
  assert.ok(code.includes("Department Details"), "Must feature clean SheetTitle");
  assert.ok(code.includes('className="sr-only"'), "Must feature accessible sr-only description");
  assert.ok(code.includes("onNavigatePrev") && code.includes("onNavigateNext"), "Must support sequential navigation");

  // Edge-to-edge line-attached status notice
  assert.ok(
    code.includes("Active Department Workspace:") && code.includes("Deactivated Department Workspace:"),
    "Must feature line-attached status notice for department workspace state"
  );

  // Card reduction: Unboxed summary strip
  assert.ok(
    !code.includes("rounded-2xl border border-border dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-4 flex items-center justify-between gap-3 shadow-2xs"),
    "Must NOT wrap summary in boxed card container"
  );
  assert.ok(
    code.includes("flex items-center justify-between gap-3 pb-4 border-b border-border/80"),
    "Summary strip must be unboxed with border-b divider"
  );

  // Footer standards
  assert.ok(code.includes("<SheetFooter"), "Must feature SheetFooter");
  assert.ok(code.includes("variant=\"outline\""), "Dismiss and action buttons must be outlined");
  assert.ok(code.includes("Close"), "Must feature Close button");
});

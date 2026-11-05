import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..");

test("Sheet primitive adopts authentic macOS / Apple inspector pane design tokens", () => {
  const sheetPath = path.join(ROOT_DIR, "src/components/ui/sheet.jsx");
  assert.ok(fs.existsSync(sheetPath), "sheet.jsx must exist");

  const code = fs.readFileSync(sheetPath, "utf8");

  // 1. Apple Dimmed Scrim Overlay
  assert.ok(
    code.includes("bg-black/35 backdrop-blur-sm"),
    "SheetOverlay must feature Apple dimmed scrim bg-black/35 backdrop-blur-sm"
  );

  // 2. Translucent Frosted Acrylic Glass & Spring Easing
  assert.ok(
    code.includes("bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl"),
    "SheetContent must feature frosted translucent material bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl"
  );
  assert.ok(
    code.includes("ease-[cubic-bezier(0.16,1,0.3,1)]"),
    "SheetContent must use Apple fluid spring bezier cubic-bezier(0.16, 1, 0.3, 1)"
  );

  // 3. Progressive Specular Diffusion Shadows & Hairline Light Borders
  assert.ok(
    code.includes("border-black/[0.08]") && code.includes("dark:data-[side=right]:border-white/10"),
    "SheetContent side border must use subtle hairline border catching specular light"
  );
  assert.ok(
    code.includes("shadow-[-20px_0_50px_rgba(0,0,0,0.12)"),
    "SheetContent side=right must cast deep progressive diffusion shadow"
  );

  // 4. Built-in Apple Circular Disc Close Button
  assert.ok(
    code.includes("size-8 rounded-full") &&
    code.includes("bg-black/[0.04]") &&
    code.includes("dark:bg-white/[0.08]"),
    "SheetContent close button must be an Apple circular floating disc"
  );

  // 5. Typographic & Divider Refinements
  assert.ok(
    code.includes("text-[17px] font-semibold tracking-[-0.015em]"),
    "SheetTitle must use Apple standard 17px semibold with tight tracking"
  );
  assert.ok(
    code.includes("border-b border-black/[0.06] dark:border-white/10"),
    "SheetHeader must feature subtle hairline bottom border"
  );
});

test("Key slide-over inspector sheets adopt unified Apple circular close button and clean layout", () => {
  const sheetFiles = [
    "src/components/systemadmin/OfficeDetailSheet.js",
    "src/components/staff/StudentProfileSheet.js",
    "src/components/student/PermanentAdmissionRecordSheet.js",
    "src/components/admin/audit-logs/LogDetailSheet.js",
    "src/components/staff/requests/DocumentRequestDetailSheet.js",
    "src/components/staff/osas/OsasPostEventReviewSheet.js",
    "src/components/staff/osas/OsasProposalReviewSheet.js",
    "src/components/systemadmin/ServiceStandardsSheet.js",
    "src/components/systemadmin/CampusOperationsTab.js",
    "src/components/systemadmin/GlobalStaffTab.js",
    "src/components/staff/NotificationsTab.js",
    "src/components/staff/StudentOrganizationsTab.js",
    "src/components/admin/OSASOrganizationComplianceView.js",
    "src/components/student/StudentOverviewTab.js",
  ];

  for (const file of sheetFiles) {
    const fullPath = path.join(ROOT_DIR, file);
    assert.ok(fs.existsSync(fullPath), `${file} must exist`);
    const code = fs.readFileSync(fullPath, "utf8");

    // Must feature Apple circular close button
    assert.ok(
      code.includes("rounded-full bg-black/[0.04]") && code.includes("dark:bg-white/[0.08]"),
      `${file} must use Apple circular disc close button`
    );

    // Must not retain obsolete squircle button class
    assert.ok(
      !code.includes("w-8 h-8 rounded-xl bg-gray-100/90"),
      `${file} must not retain obsolete w-8 h-8 rounded-xl squircle close button`
    );

    // Must not override SheetContent with hardcoded opaque card background and shadow
    assert.ok(
      !code.includes('className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden"'),
      `${file} must not override SheetContent with opaque card and heavy box shadow`
    );
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const TABS_PATH = path.resolve("src/components/ui/tabs.jsx");
const SYS_CONFIG_PATH = path.resolve("src/components/admin/SystemConfigTab.js");
const ORG_TAB_PATH = path.resolve("src/components/staff/StudentOrganizationsTab.js");
const PROFILE_SHEET_PATH = path.resolve("src/components/staff/StudentProfileSheet.js");

test("Tabs and SegmentedControl conform to Apple Human Interface Guidelines", () => {
  const tabsCode = fs.readFileSync(TABS_PATH, "utf8");

  // 1. Required exports
  const exports = [
    "Tabs",
    "TabsList",
    "TabsTrigger",
    "TabsContent",
    "SegmentedControl",
    "tabsListVariants",
    "tabsTriggerVariants",
  ];
  for (const exp of exports) {
    assert.ok(
      tabsCode.includes(exp),
      `tabs.jsx must export ${exp}`
    );
  }

  // 2. tabsListVariants variants
  assert.ok(
    tabsCode.includes("segmented:") && tabsCode.includes("capsule:"),
    "tabsListVariants must support segmented and capsule variants"
  );

  // 3. Apple elevated active pill styles (specular highlight + micro-shadow)
  assert.ok(
    tabsCode.includes("inset_0_1px_0_0_rgba(255,255,255,0.85)"),
    "TabsTrigger active state must include Apple specular top highlight inset"
  );
  assert.ok(
    tabsCode.includes("active:scale-[0.98]"),
    "TabsTrigger must include Apple tactile active scale micro-press"
  );
});

test("Sub-tab segmented switchers across app views use Apple rounded-full styling", () => {
  const sysConfigCode = fs.readFileSync(SYS_CONFIG_PATH, "utf8");
  assert.ok(
    sysConfigCode.includes("rounded-full bg-black/[0.04]"),
    "SystemConfigTab switcher track must use Apple rounded-full styling"
  );

  const orgCode = fs.readFileSync(ORG_TAB_PATH, "utf8");
  assert.ok(
    orgCode.includes("rounded-full border border-black/[0.04]"),
    "StudentOrganizationsTab subtab switcher must use Apple rounded-full styling"
  );

  const profileSheetCode = fs.readFileSync(PROFILE_SHEET_PATH, "utf8");
  assert.ok(
    profileSheetCode.includes("rounded-full border border-black/[0.04]"),
    "StudentProfileSheet checklist/files switcher must use Apple rounded-full styling"
  );
});

test("All System Admin tabs use Apple Segmented Controls instead of line tabs", () => {
  const systemAdminTabFiles = [
    "src/components/systemadmin/LandingCmsViewTabs.js",
    "src/components/systemadmin/LandingCmsSectionTabs.js",
    "src/components/systemadmin/CampusOperationsTab.js",
    "src/components/systemadmin/GlobalAuditLogsTab.js",
    "src/components/systemadmin/GlobalStaffTab.js",
    "src/components/systemadmin/ModuleConfigTab.js",
    "src/components/systemadmin/OfficeManagementTab.js",
    "src/components/systemadmin/SecurityQuestionsTab.js",
    "src/components/systemadmin/SystemBackupsTab.js",
    "src/components/systemadmin/LandingBentoCmsView.js",
  ];

  for (const relPath of systemAdminTabFiles) {
    const fullPath = path.resolve(relPath);
    assert.ok(fs.existsSync(fullPath), `File exists: ${relPath}`);
    const code = fs.readFileSync(fullPath, "utf8");

    // Zero underline indicators
    assert.ok(
      !code.includes("-bottom-px h-0.5"),
      `${relPath} must not contain underline tab indicators (-bottom-px h-0.5)`
    );

    // Converted to Apple capsule segmented control
    assert.ok(
      code.includes("rounded-full bg-black/[0.04]"),
      `${relPath} must include Apple capsule segmented control track`
    );
  }
});

test("Skeletons match Apple Segmented Control geometry", () => {
  const skeletonFiles = [
    "src/components/systemadmin/skeletons/CampusOperationsSkeleton.js",
    "src/components/systemadmin/skeletons/GlobalAuditLogsSkeleton.js",
    "src/components/systemadmin/skeletons/GlobalStaffSkeleton.js",
    "src/components/systemadmin/skeletons/ModuleConfigSkeleton.js",
    "src/components/systemadmin/skeletons/OfficeManagementPageSkeleton.js",
    "src/components/systemadmin/skeletons/SecurityQuestionsSkeleton.js",
  ];

  for (const relPath of skeletonFiles) {
    const fullPath = path.resolve(relPath);
    assert.ok(fs.existsSync(fullPath), `File exists: ${relPath}`);
    const code = fs.readFileSync(fullPath, "utf8");

    assert.ok(
      !code.includes("-bottom-px h-0.5"),
      `${relPath} must not contain underline tab indicators in skeleton`
    );
    assert.ok(
      code.includes("rounded-full bg-black/[0.04]"),
      `${relPath} skeleton must mirror Apple capsule segmented control track`
    );
  }
});

test("Staff and Admin directory, notification, and utility switchers use Apple Segmented Controls", () => {
  const staffAdminFiles = [
    "src/components/staff/StudentDirectoryTab.js",
    "src/components/staff/NotificationsTab.js",
    "src/components/admin/StaffDirectoryTab.js",
    "src/components/admin/RateLimitingTab.js",
    "src/components/admin/storage-layout/CabinetSidebar.js",
    "src/components/staff/OsasMonitoringTab.js",
    "src/components/admin/SLAAnalyticsTab.js",
  ];

  for (const relPath of staffAdminFiles) {
    const fullPath = path.resolve(relPath);
    assert.ok(fs.existsSync(fullPath), `File exists: ${relPath}`);
    const code = fs.readFileSync(fullPath, "utf8");

    assert.ok(
      code.includes("rounded-full bg-black/[0.04]"),
      `${relPath} must use Apple capsule segmented control styling`
    );
  }
});

test("Zero line-tab underline indicators exist anywhere in src/components", () => {
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".jsx"))) {
        const content = fs.readFileSync(fullPath, "utf8");
        assert.ok(
          !content.includes("-bottom-px h-0.5") && !content.includes("bottom-[-2px] data-[orientation=horizontal]:after:h-0.5"),
          `Found obsolete line-tab underline indicator in ${fullPath}`
        );
      }
    }
  }

  scanDir(path.resolve("src/components"));
});

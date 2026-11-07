import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const PAGE_HEADER_PATH = path.resolve("src/components/shared/PageHeader.js");
const STANDARDS_PATH = path.resolve("../DASHBOARD_LAYOUT_AND_TOOLBAR_STANDARDS.md");

test("PageHeader implements three-dot button that disappears on click to reveal secondary actions", () => {
  const code = fs.readFileSync(PAGE_HEADER_PATH, "utf8");

  // 1. MoreHorizontalIcon imported from hugeicons-react
  assert.ok(
    code.includes("MoreHorizontalIcon"),
    "PageHeader must import MoreHorizontalIcon"
  );

  // 2. secondaryActions container precedes the three-dot button in flex row (revealing to its left)
  const secondaryActionsIdx = code.indexOf("id={secondaryActionsId}");
  const moreActionsBtnIdx = code.indexOf("ref={moreActionsRef}");
  const actionsIdx = code.lastIndexOf("{actions}");

  assert.ok(secondaryActionsIdx > 0, "PageHeader must render secondaryActions container");
  assert.ok(moreActionsBtnIdx > 0, "PageHeader must render three-dot moreActions button");
  assert.ok(actionsIdx > 0, "PageHeader must render actions");

  assert.ok(
    secondaryActionsIdx < moreActionsBtnIdx,
    "secondaryActions container must be placed immediately BEFORE moreActions button in DOM order (revealed to its left)"
  );
  assert.ok(
    moreActionsBtnIdx < actionsIdx,
    "moreActions button must be placed BEFORE actions so actions remain to its right"
  );

  // 3. Three-dot button disappears when clicked (showSecondaryActions is true)
  assert.ok(
    code.includes("secondaryActions && !showSecondaryActions &&"),
    "three-dot button must disappear when clicked (!showSecondaryActions)"
  );

  // 4. Outside click and onClickCapture collapse secondary actions
  assert.ok(
    code.includes("closeOnOutsideClick"),
    "Outside click handler must close secondaryActions"
  );
  assert.ok(
    code.includes("setShowSecondaryActions(false)"),
    "Must have logic to collapse secondaryActions back"
  );

  // 5. Escape key collapses back and returns focus
  assert.ok(
    code.includes('event.key === "Escape"') && code.includes("moreActionsRef.current?.focus()"),
    "Escape key must collapse secondary actions and restore focus to trigger"
  );
});

test("SuperAdmin pages adhere to RefreshButton exemption and more action overflow", () => {
  // If RefreshButton is present, secondary actions stay in actions without secondaryActions
  const globalAuditLogsCode = fs.readFileSync(path.resolve("src/components/systemadmin/GlobalAuditLogsTab.js"), "utf8");
  assert.ok(
    globalAuditLogsCode.includes("<RefreshButton") &&
    globalAuditLogsCode.includes("Export CSV") &&
    !globalAuditLogsCode.includes("secondaryActions="),
    "GlobalAuditLogsTab has RefreshButton so Export CSV stays directly in actions without secondaryActions"
  );

  const systemBackupsCode = fs.readFileSync(path.resolve("src/components/systemadmin/SystemBackupsTab.js"), "utf8");
  const backupsHeaderMatch = systemBackupsCode.match(/<PageHeader[\s\S]*?\/>/);
  assert.ok(
    systemBackupsCode.includes("<RefreshButton") &&
    systemBackupsCode.includes("Restore Backup") &&
    backupsHeaderMatch &&
    !backupsHeaderMatch[0].includes("secondaryActions"),
    "SystemBackupsTab has RefreshButton so Restore Backup stays directly in actions without PageHeader secondaryActions"
  );

  // If no RefreshButton and buttons > 2, secondaryActions is used
  const brandingCode = fs.readFileSync(path.resolve("src/components/systemadmin/InstitutionalBrandingTab.js"), "utf8");
  assert.ok(
    !brandingCode.includes("<RefreshButton") &&
    brandingCode.includes("secondaryActions={") &&
    brandingCode.includes("Restore Defaults"),
    "InstitutionalBrandingTab has no RefreshButton and >2 buttons, so Restore Defaults is in secondaryActions"
  );

  const landingHeroCode = fs.readFileSync(path.resolve("src/components/systemadmin/LandingPageCmsTab.js"), "utf8");
  assert.ok(
    !landingHeroCode.includes("<RefreshButton") &&
    landingHeroCode.includes("secondaryActions={") &&
    landingHeroCode.includes("Restore Defaults"),
    "LandingPageCmsTab has no RefreshButton and >2 buttons, so Restore Defaults is in secondaryActions"
  );

  const securityQuestionsCode = fs.readFileSync(path.resolve("src/components/systemadmin/SecurityQuestionsTab.js"), "utf8");
  assert.ok(
    securityQuestionsCode.includes("All questions saved") &&
    securityQuestionsCode.match(/title=\{[\s\S]*?All questions saved[\s\S]*?\}/),
    "SecurityQuestionsTab must place 'All questions saved' status pill inside title beside the summary"
  );
  assert.ok(
    securityQuestionsCode.includes("Discard Draft") &&
    securityQuestionsCode.includes("handleDiscardDraft"),
    "SecurityQuestionsTab must provide a Discard Draft button via secondaryActions when dirty"
  );
});

test("DASHBOARD_LAYOUT_AND_TOOLBAR_STANDARDS.md documents the RefreshButton exemption and disappearing three-dot button", () => {
  const standards = fs.readFileSync(STANDARDS_PATH, "utf8");

  assert.ok(
    standards.includes("The Refresh Button Exemption"),
    "Standards document must specify the Refresh Button Exemption"
  );
  assert.ok(
    standards.includes("When to Use the More Action Button"),
    "Standards document must specify when to use the more action button"
  );
  assert.ok(
    standards.includes("makes the three-dot button itself disappear"),
    "Standards document must specify that clicking the three-dot button makes it disappear"
  );
  assert.ok(
    standards.includes("Auto-Dismiss & Collapse Back"),
    "Standards document must document auto-dismiss and collapse back"
  );
});

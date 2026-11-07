import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDefaultHomeView } from "../src/lib/roleUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

test("getDefaultHomeView resolves correctly across roles and user preferences", () => {
  // 1. Student Role
  const studentDefault = getDefaultHomeView({ role: "Student" });
  assert.equal(studentDefault.view, "overview");
  assert.equal(studentDefault.label, "Overview & Compliance");
  assert.equal(studentDefault.path, "/student?view=overview");

  const studentCompliance = getDefaultHomeView({
    role: "Student",
    preferences: { default_home_view: "compliance" },
  });
  assert.equal(studentCompliance.view, "compliance");
  assert.equal(studentCompliance.label, "Requirements & Compliance");
  assert.equal(studentCompliance.path, "/student?view=compliance");

  const studentRequests = getDefaultHomeView({
    role: "Student",
    preferences: { default_home_view: "requests" },
  });
  assert.equal(studentRequests.view, "odrs");
  assert.equal(studentRequests.label, "Document Requests");
  assert.equal(studentRequests.path, "/student?view=odrs");

  // 2. SystemAdmin / SuperAdmin Role
  const sysAdminDefault = getDefaultHomeView({ role: "SystemAdmin" });
  assert.equal(sysAdminDefault.view, "health");
  assert.equal(sysAdminDefault.label, "Campus Operations");
  assert.equal(sysAdminDefault.path, "/systemadmin?view=health");

  const sysAdminOffices = getDefaultHomeView({
    role: "SuperAdmin",
    preferences: { default_home_view: "offices" },
  });
  assert.equal(sysAdminOffices.view, "offices");
  assert.equal(sysAdminOffices.label, "Departments & Stations");
  assert.equal(sysAdminOffices.path, "/systemadmin?view=offices");

  // 3. Admin Role
  const adminDefault = getDefaultHomeView({ role: "Admin" });
  assert.equal(adminDefault.view, "review");
  assert.equal(adminDefault.label, "Records Review");
  assert.equal(adminDefault.path, "/admin?view=review");

  const adminStorage = getDefaultHomeView({
    role: "Admin",
    preferences: { default_home_view: "storage_layout" },
  });
  assert.equal(adminStorage.view, "storage_layout");
  assert.equal(adminStorage.label, "Storage Room Layout");
  assert.equal(adminStorage.path, "/admin?view=storage_layout");

  // 4. Staff Role (Registrar)
  const staffDefault = getDefaultHomeView({ role: "Staff", office_id: "registrar" });
  assert.equal(staffDefault.view, "requests");
  assert.equal(staffDefault.label, "Document Requests");
  assert.equal(staffDefault.path, "/staff?view=requests");

  const staffUpload = getDefaultHomeView({
    role: "Staff",
    office_id: "registrar",
    preferences: { default_home_view: "upload" },
  });
  assert.equal(staffUpload.view, "upload");
  assert.equal(staffUpload.label, "Scan & Upload");
  assert.equal(staffUpload.path, "/staff?view=upload");

  // 5. Staff Role (OSAS)
  const osasStaffDefault = getDefaultHomeView({ role: "Staff", office_id: "osas" });
  assert.equal(osasStaffDefault.view, "osas_monitoring");
  assert.equal(osasStaffDefault.label, "Organization Monitoring");
  assert.equal(osasStaffDefault.path, "/staff?view=osas_monitoring");

  const osasStaffOrgs = getDefaultHomeView({
    role: "Staff",
    section: "OSAS",
    preferences: { default_home_view: "organizations" },
  });
  assert.equal(osasStaffOrgs.view, "organizations");
  assert.equal(osasStaffOrgs.label, "Student Organizations");
  assert.equal(osasStaffOrgs.path, "/staff?view=organizations");
});

test("Sidebar.js profile menu button aligns with default home view", () => {
  const sidebarPath = path.join(ROOT_DIR, "src/components/shared/Sidebar.js");
  const content = fs.readFileSync(sidebarPath, "utf8");

  // Imports
  assert.ok(content.includes("Home01Icon"), "Sidebar.js must import Home01Icon");
  assert.ok(content.includes("getDefaultHomeView"), "Sidebar.js must import getDefaultHomeView");

  // Profile popover button
  assert.ok(
    content.includes("Return to Home View"),
    "Sidebar.js profile menu must feature 'Return to Home View'"
  );
  assert.ok(
    content.includes("{defaultHome.label}"),
    "Sidebar.js profile menu must display the default home view's label"
  );
  assert.ok(
    content.includes("!isAtDefaultHome"),
    "Sidebar.js must hide 'Return to Home View' when the user is already on the default home view"
  );
  assert.ok(
    content.includes("Home01Icon size=\"1em\""),
    "Sidebar.js profile menu item must render Home01Icon"
  );

  // handleMainDashboardClick behavior
  assert.ok(
    content.includes("defaultHome.path"),
    "handleMainDashboardClick must navigate to defaultHome.path"
  );
  assert.ok(
    content.includes("detail: { view: defaultHome.view }"),
    "handleMainDashboardClick must dispatch switch-view with defaultHome.view"
  );
});

test("CommandPalette.js action aligns with default home view", () => {
  const palettePath = path.join(ROOT_DIR, "src/components/shared/CommandPalette.js");
  const content = fs.readFileSync(palettePath, "utf8");

  assert.ok(content.includes("Home01Icon"), "CommandPalette.js must import Home01Icon");
  assert.ok(content.includes("getDefaultHomeView"), "CommandPalette.js must import getDefaultHomeView");
  assert.ok(
    content.includes("Return to Home View (${defaultHome.label})"),
    "CommandPalette.js must offer dynamic 'Return to Home View ([Label])'"
  );
  assert.ok(
    content.includes("!isAtDefaultHome"),
    "CommandPalette.js must scope return to home when not at default home"
  );
});

test("student/page.js honors authUser.preferences.default_home_view", () => {
  const studentPath = path.join(ROOT_DIR, "src/app/student/page.js");
  const content = fs.readFileSync(studentPath, "utf8");

  assert.ok(
    content.includes("authUser?.preferences?.default_home_view"),
    "student/page.js must check authUser.preferences.default_home_view"
  );
  assert.ok(
    content.includes("normalizeStudentTab"),
    "student/page.js must normalize student preferences (e.g., 'requests' -> 'odrs', 'default' -> 'overview')"
  );
});

test("Campus Operations is placed as the very first section in systemadmin navigation", () => {
  const sysAdminPagePath = path.join(ROOT_DIR, "src/app/systemadmin/page.js");
  const sysAdminContent = fs.readFileSync(sysAdminPagePath, "utf8");

  const sidebarPath = path.join(ROOT_DIR, "src/components/shared/Sidebar.js");
  const sidebarContent = fs.readFileSync(sidebarPath, "utf8");

  // Verify SYSTEMADMIN_NAV_ITEMS starts with Campus Operations
  const navItemsMatch = sysAdminContent.indexOf("SYSTEMADMIN_NAV_ITEMS");
  assert.ok(navItemsMatch !== -1, "SYSTEMADMIN_NAV_ITEMS must exist in systemadmin/page.js");
  const navSlice = sysAdminContent.slice(navItemsMatch, navItemsMatch + 300);
  assert.ok(
    navSlice.indexOf("Campus Operations") < navSlice.indexOf("Institutional Governance"),
    "SYSTEMADMIN_NAV_ITEMS must place Campus Operations before Institutional Governance"
  );

  // Verify Sidebar candidateGroups starts with sys_ops for systemadmin
  const sysAdminBlock = sidebarContent.indexOf('if (activeView === "systemadmin") {');
  assert.ok(sysAdminBlock !== -1, "Sidebar must have systemadmin candidateGroups block");
  const candidateSlice = sidebarContent.slice(sysAdminBlock, sysAdminBlock + 1500);
  assert.ok(
    candidateSlice.indexOf("sys_ops") < candidateSlice.indexOf("sys_gov"),
    "Sidebar candidateGroups must place sys_ops before sys_gov"
  );
});

import assert from "node:assert/strict";
import test from "node:test";

const MODULE_KEY_MAP = {
  requests: "document_requests",
  osas_monitoring: "osas_monitoring",
  students: "student_directory",
  upload: "scan_upload",
  batch_review: "scan_upload",
  documents: "documents",
  notifications: "notifications",
  search: "records_archive",
  storage: "storage_explorer",
};

function isStaffTabPermitted(tabKey, enabledModules = []) {
  const enabled = new Set(enabledModules);
  const requiredModule = MODULE_KEY_MAP[tabKey];
  if (!requiredModule) return true;
  return enabled.has(requiredModule);
}

function filterStaffHeaderItems(items, enabledModules = []) {
  const enabledSet = new Set(enabledModules);
  const hasModuleFilter = Array.isArray(enabledModules) && enabledModules.length > 0;
  return items.filter((item) => {
    if (!hasModuleFilter || !item.module) return true;
    return enabledSet.has(item.module);
  });
}

test("staff tab gating: students tab is disallowed when student_directory is disabled, even if records_archive is enabled", () => {
  const osasModules = [
    "records_archive",
    "osas_monitoring",
    "documents",
    "scan_upload",
    "notifications"
  ];

  assert.equal(isStaffTabPermitted("students", osasModules), false);
  assert.equal(isStaffTabPermitted("search", osasModules), true);
  assert.equal(isStaffTabPermitted("osas_monitoring", osasModules), true);
});

test("staff tab gating: students tab is allowed when student_directory is enabled", () => {
  const registrarModules = [
    "records_archive",
    "student_directory",
    "document_requests",
    "documents",
    "scan_upload",
    "notifications"
  ];

  assert.equal(isStaffTabPermitted("students", registrarModules), true);
  assert.equal(isStaffTabPermitted("search", registrarModules), true);
  assert.equal(isStaffTabPermitted("requests", registrarModules), true);
});

test("header navigation gating: Student Directory item is hidden when student_directory is disabled", () => {
  const staffItems = [
    { view: "search", module: "records_archive", label: "Records & Archive" },
    { view: "students", module: "student_directory", label: "Student Directory" },
    { view: "storage", module: "storage_explorer", label: "Storage Explorer" },
  ];

  const osasModules = ["records_archive", "osas_monitoring"];
  const visible = filterStaffHeaderItems(staffItems, osasModules);

  assert.equal(visible.some((i) => i.view === "students"), false);
  assert.equal(visible.some((i) => i.view === "search"), true);
});

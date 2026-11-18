import test from "node:test";
import assert from "node:assert/strict";
import {
  classifySavedWorkViewState,
  classifyViewPreferenceField,
  createViewPreferenceStore,
  deleteSavedWorkView,
  getSavedViewPagesForUser,
  inspectSavedViewForPage,
  listAllSavedWorkViewsForUser,
  normalizeViewPreference,
  readSavedWorkViews,
  renameSavedWorkView,
  resetAllSavedViewsForUser,
  resetSavedViewForPage,
  restoreViewPreference,
  saveWorkView,
  serializeViewPreference,
  viewPreferenceKey,
  workspaceViewPreferenceKey,
} from "../src/lib/viewPreferences.js";

const user = { id: "PUPSUPERADMIN-001", role: "SuperAdmin" };
const normalize = (value) => normalizeViewPreference("staff", "visibleColumns", value, ["name", "office"]);

function storageFixture() {
  const data = new Map();
  return { data, storage: { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } };
}

test("keys isolate accounts, pages and fields; other portals have no SuperAdmin key", () => {
  const key = viewPreferenceKey(user, "staff", "visibleColumns");
  assert.notEqual(key, viewPreferenceKey({ ...user, id: "OTHER" }, "staff", "visibleColumns"));
  assert.notEqual(key, viewPreferenceKey(user, "offices", "visibleColumns"));
  assert.notEqual(key, viewPreferenceKey(user, "staff", "filterRules"));
  assert.equal(viewPreferenceKey({ ...user, role: "Staff" }, "staff", "visibleColumns"), null);
  assert.equal(viewPreferenceKey(null, "staff", "visibleColumns"), null);
});

test("reading defaults never overwrites storage; snapshots are stable across repeated reads", () => {
  const { storage, data } = storageFixture();
  const store = createViewPreferenceStore(() => storage);
  const fallback = ["name", "office"];
  const first = store.read("view", fallback, normalize);
  assert.equal(store.read("view", fallback, normalize), first);
  assert.equal(data.size, 0);
  data.set("view", '["name","updated_at"]');
  const restored = store.read("view", fallback, normalize);
  assert.deepEqual(restored, ["name", "updated_at"]);
  assert.equal(store.read("view", fallback, normalize), restored);
});

test("workspace preferences isolate accounts, offices, roles and pages while retaining OSAS saves", () => {
  const admin = { id: "123", role: "Admin", office_id: "registrar" };
  const staff = { ...admin, role: "Staff" };
  const student = { id: "123", role: "Student", account_id: 123 };
  const osas = { ...admin, office_id: "osas" };
  const field = "sortBy";
  const key = workspaceViewPreferenceKey(admin, "documents", field);
  assert.notEqual(key, workspaceViewPreferenceKey(staff, "documents", field));
  assert.notEqual(key, workspaceViewPreferenceKey(student, "documents", field));
  assert.notEqual(key, workspaceViewPreferenceKey(osas, "documents", field));
  assert.notEqual(key, workspaceViewPreferenceKey(admin, "audit_logs", field));
  assert.equal(workspaceViewPreferenceKey(null, "documents", field), null);
  assert.notEqual(workspaceViewPreferenceKey(student, "documents", field),
    workspaceViewPreferenceKey({ ...student, account_id: 124 }, "documents", field));
  assert.equal(workspaceViewPreferenceKey(student, "documents", field),
    workspaceViewPreferenceKey({ ...student, id: "changed-student-number" }, "documents", field));
  assert.equal(workspaceViewPreferenceKey(osas, "documents", field, { preserveOsasKey: true }),
    "pup_osas_view_v1:123:documents:sortBy");
  assert.equal(workspaceViewPreferenceKey(admin, "documents", field, { preserveOsasKey: true }), key);
  assert.equal(workspaceViewPreferenceKey(admin, "records_archive", "selectedYear", { preserveOsasKey: true }), null);

  const { storage } = storageFixture();
  createViewPreferenceStore(() => storage).write(key, "created_at");
  const reloaded = createViewPreferenceStore(() => storage);
  assert.equal(reloaded.read(key, "student_no", String), "created_at");
  assert.equal(reloaded.read(workspaceViewPreferenceKey(staff, "documents", field), "student_no", String), "student_no");
});

test("stored changes survive a new store, notify mounted consumers, and respect external removal", () => {
  const { storage, data } = storageFixture();
  const store = createViewPreferenceStore(() => storage);
  let updates = 0;
  const unsubscribe = store.subscribe("view", () => updates++);
  store.write("view", ["email", "updated_at"]);
  assert.equal(updates, 1);
  assert.deepEqual(createViewPreferenceStore(() => storage).read("view", [], normalize), ["email", "updated_at"]);
  data.delete("view");
  assert.deepEqual(store.read("view", ["name"], normalize), ["name"]);
  unsubscribe();
  store.write("view", ["office"]);
  assert.equal(updates, 1);
});

test("malformed and outdated preferences recover safely", () => {
  const { storage, data } = storageFixture();
  const store = createViewPreferenceStore(() => storage);
  const fallback = ["name", "office"];
  data.set("view", "{broken");
  assert.deepEqual(store.read("view", fallback, normalize), fallback);
  data.set("view", '["name","removed-column","name"]');
  assert.deepEqual(store.read("view", fallback, normalize), ["name", "office"]);
  assert.deepEqual(normalize(["obsolete-only"]), fallback);
  assert.deepEqual(normalize(null), fallback);
  assert.deepEqual(normalize([]), fallback);
  assert.equal(normalizeViewPreference("logs", "limit", -50, 20), 20);
  assert.equal(normalizeViewPreference("logs", "startDate", "2026-02-30", ""), "");
  assert.equal(normalizeViewPreference("logs", "startDate", "2026-11-03", ""), "2026-11-03");
  assert.equal(normalizeViewPreference("logs", "sortBy", "unknown", "created_at"), "created_at");
  assert.equal(normalizeViewPreference("modules", "matrixSortBy", "required", "name"), "required");
  assert.equal(normalizeViewPreference("cms-hero", "activeTab", "slides", "slides"), "slides");
  assert.equal(normalizeViewPreference("cms-hero", "activeTab", "content", "slides"), "slides");
  assert.equal(normalizeViewPreference("backups", "backupTypeFilter", "Scheduled", "all"), "Scheduled");
});

test("filter rules and multi-value filters validate structure, remove obsolete fields and duplicate IDs", () => {
  const rules = [
    { id: "a", fieldKey: "role", operator: "is", value: "Admin" },
    { id: "a", fieldKey: "office", operator: "is", value: "osas" },
    { id: "b", fieldKey: "removed", operator: "is", value: "x" },
    { id: "c", fieldKey: "office", operator: "is", value: {} },
  ];
  assert.deepEqual(normalizeViewPreference("staff", "filterRules", rules, []), [rules[0]]);
  const fallback = { severity: [], office: [] };
  assert.equal(normalizeViewPreference("logs", "logFilters", { severity: "INFO", office: [] }, fallback), fallback);
  assert.deepEqual(normalizeViewPreference("offices", "visibleColumns", ["status"], ["department", "office"]), ["status", "department"]);
});

test("legacy column selections retain formerly fixed columns and new selections can hide them", () => {
  const { storage, data } = storageFixture();
  const store = createViewPreferenceStore(() => storage);
  const field = "visibleColumns";
  const fallback = ["id", "department", "requester", "title", "details", "status", "submitted"];
  const key = viewPreferenceKey(user, "operations", field);
  const restore = (value) => restoreViewPreference("operations", field, value, fallback);
  data.set(key, '["title","status"]');
  assert.deepEqual(store.read(key, fallback, restore), ["id", "title", "status"]);

  const selected = ["title", "status"];
  store.write(key, selected, serializeViewPreference("operations", field, selected));
  const reloaded = createViewPreferenceStore(() => storage);
  assert.deepEqual(reloaded.read(key, fallback, restore), selected);
  assert.deepEqual(restore({ selected: ["title"] }), ["title", "id"]);
});

test("blocked and full storage retain usable in-memory preferences, and recover when writable", () => {
  let blocked = true;
  const { storage } = storageFixture();
  const store = createViewPreferenceStore(() => {
    if (blocked) throw new Error("Storage disabled");
    return storage;
  });
  assert.deepEqual(store.read("view", ["name"], normalize), ["name"]);
  store.write("view", ["email"]);
  assert.deepEqual(store.read("view", ["name"], normalize), ["email"]);
  blocked = false;
  assert.deepEqual(store.read("view", ["name"], normalize), ["email"]);
  assert.equal(storage.getItem("view"), '["email"]');
});

test("SuperAdmin SLA and portal filters, audit grouping, and personnel severity survive reload", () => {
  const { storage } = storageFixture();
  const store = createViewPreferenceStore(() => storage);
  const reloaded = createViewPreferenceStore(() => storage);
  const preferences = [
    ["operations", "operationFilters", [], [{ id: "sla", fieldKey: "queue_risk", operator: "is", value: "overdue" }]],
    ["portal-accounts", "filterRules", [], [{ id: "status", fieldKey: "status", operator: "is_not", value: "Archived" }]],
    ["portal-accounts", "groupBy", "none", "affiliation"],
    ["portal-accounts", "sortBy", "createdAt", "studentNo"],
    ["portal-accounts", "sortOrder", "DESC", "ASC"],
    ["portal-accounts", "visibleColumns", ["name", "email", "affiliation", "status", "studentNo", "createdAt"], ["name", "status"]],
    ["logs", "groupBy", "none", "severity"],
    ["personnel-activity", "severity", "All", "WARNING"],
  ];
  for (const [page, field, fallback, selection] of preferences) {
    const key = viewPreferenceKey(user, page, field);
    const validate = (value) => normalizeViewPreference(page, field, value, fallback);
    store.write(key, validate(selection));
    assert.deepEqual(reloaded.read(key, fallback, validate), selection);
    store.write(key, validate(fallback));
    assert.deepEqual(reloaded.read(key, fallback, validate), fallback);
  }
});

test("SuperAdmin and shared table column controls default to essential columns and reset to defaults instead of all columns", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const controlsCode = fs.readFileSync(
    path.resolve(__dirname, "../src/components/systemadmin/OfficeTableControls.js"),
    "utf8"
  );
  assert.ok(
    controlsCode.includes("onClick={() => onVisibleColumnsChange(defaultColumnKeys)}") &&
      controlsCode.includes("disabled={isAtDefault}"),
    "ColumnsPopover Reset Columns must restore defaultColumnKeys and disable when at defaults"
  );
  assert.ok(
    !controlsCode.includes("onClick={() => onVisibleColumnsChange(columns.map(({ key }) => key))}"),
    "ColumnsPopover Reset Columns must not check all columns indiscriminately"
  );

  const staffCode = fs.readFileSync(
    path.resolve(__dirname, "../src/components/systemadmin/GlobalStaffTab.js"),
    "utf8"
  );
  assert.ok(
    staffCode.includes('["id", "name", "email", "office", "role", "section", "totp_enabled"]'),
    "GlobalStaffTab must default visibleColumns to essential staff columns (excluding last_active, created_at, updated_at)"
  );
  assert.ok(
    staffCode.includes('{ key: "last_active", label: "Last Sign-in", defaultHidden: true }') &&
      staffCode.includes('{ key: "created_at", label: "Date Added", defaultHidden: true }') &&
      staffCode.includes('{ key: "updated_at", label: "Last Updated", defaultHidden: true }'),
    "GlobalStaffTab must mark Last Sign-in, Date Added, and Last Updated as defaultHidden"
  );

  const backupTableCode = fs.readFileSync(
    path.resolve(__dirname, "../src/components/systemadmin/PlatformBackupTable.js"),
    "utf8"
  );
  assert.ok(
    backupTableCode.includes('{ key: "actor", label: "Actor", kind: "text", defaultHidden: true }'),
    "PlatformBackupTable must mark Actor column as defaultHidden"
  );
  assert.deepEqual(
    normalizeViewPreference("backups", "visibleColumns", ["size", "created", "actor", "type", "status"], []),
    ["size", "created", "actor", "type", "status"]
  );
});

function fullStorageFixture() {
  const data = new Map();
  return {
    data,
    storage: {
      get length() {
        return data.size;
      },
      key(index) {
        return Array.from(data.keys())[index] ?? null;
      },
      getItem(key) {
        return data.get(key) ?? null;
      },
      setItem(key, value) {
        data.set(key, String(value));
      },
      removeItem(key) {
        data.delete(key);
      },
    },
  };
}

test("classifyViewPreferenceField maps filters, sorting, grouping, columns, and layout including stream-prefixed fields", () => {
  assert.equal(classifyViewPreferenceField("filterRules"), "filters");
  assert.equal(classifyViewPreferenceField("proposals.filterRules"), "filters");
  assert.equal(classifyViewPreferenceField("statusFilters"), "filters");
  assert.equal(classifyViewPreferenceField("startDate"), "filters");
  assert.equal(classifyViewPreferenceField("searchQuery"), "filters");
  assert.equal(classifyViewPreferenceField("sortBy"), "sorting");
  assert.equal(classifyViewPreferenceField("post_events.tableSortOrder"), "sorting");
  assert.equal(classifyViewPreferenceField("folderSortBy"), "sorting");
  assert.equal(classifyViewPreferenceField("groupBy"), "grouping");
  assert.equal(classifyViewPreferenceField("matrixGroupBy"), "grouping");
  assert.equal(classifyViewPreferenceField("visibleColumns"), "columns");
  assert.equal(classifyViewPreferenceField("proposals.visibleColumns"), "columns");
  assert.equal(classifyViewPreferenceField("viewMode"), "layout");
  assert.equal(classifyViewPreferenceField("layoutView"), "layout");
  assert.equal(classifyViewPreferenceField("pageSize"), "layout");
  assert.equal(classifyViewPreferenceField("proposals.itemsPerPage"), "layout");
});

test("getSavedViewPagesForUser returns role and office-appropriate workspace pages", () => {
  const superAdminPages = getSavedViewPagesForUser({ id: "SA-1", role: "SuperAdmin" });
  assert.ok(superAdminPages.some((p) => p.id === "operations"));
  assert.ok(superAdminPages.some((p) => p.id === "landing" && p.pageKeys.includes("cms-hero")));

  const adminPages = getSavedViewPagesForUser({ id: "ADM-1", role: "Admin", office_id: "registrar" });
  assert.ok(adminPages.some((p) => p.id === "digital_records_review"));
  assert.ok(!adminPages.some((p) => p.id === "operations"));

  const osasStaffPages = getSavedViewPagesForUser({ id: "STF-1", role: "Staff", office_id: "osas" });
  assert.ok(osasStaffPages.some((p) => p.id === "osas_monitoring"));
  assert.ok(osasStaffPages.some((p) => p.id === "documents" && p.pageKeys.includes("office_documents")));

  const regStaffPages = getSavedViewPagesForUser({ id: "STF-2", role: "Staff", office_id: "registrar" });
  assert.ok(regStaffPages.some((p) => p.id === "document_requests"));
  assert.ok(regStaffPages.some((p) => p.id === "records_archive" && p.pageKeys.includes("archive_files")));

  const studentPages = getSavedViewPagesForUser({ id: "STU-1", account_id: 9, role: "Student", client_type: "Student", portal_setup_complete: true });
  assert.ok(studentPages.some((p) => p.id === "student_requests"));
  assert.ok(studentPages.some((p) => p.id === "student_compliance"));
});

test("resetSavedViewForPage clears a selected page's filters, sorting, grouping, columns, and layout together and notifies mounted stores", () => {
  const { storage, data } = fullStorageFixture();
  const store = createViewPreferenceStore(() => storage);
  const staffUser = { id: "PUPREG-002", role: "Staff", office_id: "registrar" };
  const otherUser = { id: "PUPREG-999", role: "Staff", office_id: "registrar" };

  const filterKey = workspaceViewPreferenceKey(staffUser, "document_requests", "filterRules");
  const sortKey = workspaceViewPreferenceKey(staffUser, "document_requests", "sortBy");
  const groupKey = workspaceViewPreferenceKey(staffUser, "document_requests", "groupBy");
  const colsKey = workspaceViewPreferenceKey(staffUser, "document_requests", "visibleColumns");
  const layoutKey = workspaceViewPreferenceKey(staffUser, "document_requests", "viewMode");
  const otherPageKey = workspaceViewPreferenceKey(staffUser, "student_directory", "filterRules");
  const otherUserKey = workspaceViewPreferenceKey(otherUser, "document_requests", "filterRules");

  store.write(filterKey, [{ id: "1", fieldKey: "status", operator: "is", value: "Pending" }]);
  store.write(sortKey, "student_name");
  store.write(groupKey, "status");
  store.write(colsKey, ["student", "doc_type"]);
  store.write(layoutKey, "kanban");
  store.write(otherPageKey, [{ id: "2", fieldKey: "course", operator: "is", value: "BSIT" }]);
  store.write(otherUserKey, [{ id: "3", fieldKey: "status", operator: "is", value: "Ready" }]);

  let notifications = 0;
  const unsubscribe = store.subscribe(colsKey, () => {
    notifications += 1;
  });

  const inspected = inspectSavedViewForPage(staffUser, ["document_requests"], storage);
  assert.equal(inspected.keys.length, 5);
  assert.deepEqual(inspected.categories, ["filters", "sorting", "grouping", "columns", "layout"]);

  const result = resetSavedViewForPage(staffUser, ["document_requests"], storage);
  assert.equal(result.removedCount, 5);
  assert.deepEqual(result.categories, ["filters", "sorting", "grouping", "columns", "layout"]);
  assert.equal(notifications, 1);

  assert.equal(data.has(filterKey), false);
  assert.equal(data.has(sortKey), false);
  assert.equal(data.has(groupKey), false);
  assert.equal(data.has(colsKey), false);
  assert.equal(data.has(layoutKey), false);
  assert.equal(data.has(otherPageKey), true);
  assert.equal(data.has(otherUserKey), true);
  assert.deepEqual(store.read(colsKey, ["student", "doc_type", "status"], (v) => v), ["student", "doc_type", "status"]);

  unsubscribe();
});

test("AccountSettingsPanel renders SavedViewsResetSetting in Preferences -> Workspace", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const panelCode = fs.readFileSync(
    path.resolve(__dirname, "../src/components/shared/AccountSettingsPanel.js"),
    "utf8"
  );
  assert.ok(panelCode.includes("import SavedViewsResetSetting from \"@/components/shared/SavedViewsResetSetting\""));
  assert.ok(panelCode.includes("<SavedViewsResetSetting authUser={authUser} />"));
});

test("resetAllSavedViewsForUser clears all customized pages for the user while preserving other users", () => {
  const { storage, data } = fullStorageFixture();
  const store = createViewPreferenceStore(() => storage);
  const staffUser = { id: "PUPREG-002", role: "Staff", office_id: "registrar" };
  const otherUser = { id: "PUPREG-999", role: "Staff", office_id: "registrar" };

  const reqKey = workspaceViewPreferenceKey(staffUser, "document_requests", "filterRules");
  const dirKey = workspaceViewPreferenceKey(staffUser, "student_directory", "visibleColumns");
  const otherUserKey = workspaceViewPreferenceKey(otherUser, "document_requests", "filterRules");

  store.write(reqKey, [{ id: "1", fieldKey: "status", operator: "is", value: "Pending" }]);
  store.write(dirKey, ["student_no", "name"]);
  store.write(otherUserKey, [{ id: "2", fieldKey: "status", operator: "is", value: "Ready" }]);

  const result = resetAllSavedViewsForUser(staffUser, storage);
  assert.equal(result.removedCount, 2);
  assert.equal(result.pageCount, 2);
  assert.equal(data.has(reqKey), false);
  assert.equal(data.has(dirKey), false);
  assert.equal(data.has(otherUserKey), true);
});

test("saveWorkView, renameSavedWorkView, deleteSavedWorkView, and listAllSavedWorkViewsForUser manage named views per user and page", () => {
  const { storage } = fullStorageFixture();
  const registrarStaff = { id: "PUPREG-002", role: "Staff", office_id: "registrar" };
  const osasStaff = { id: "PUPOSAS-002", role: "Staff", office_id: "osas" };

  const saved = saveWorkView(
    registrarStaff,
    "document_requests",
    {
      name: "Awaiting Payment",
      state: {
        statusFilters: ["PendingPayment"],
        visibleColumns: ["student_no", "student", "docType", "status"],
        sortBy: "created_at",
        sortOrder: "ASC",
        viewMode: "table",
      },
    },
    storage
  );
  assert.equal(saved.updated, false);
  assert.equal(saved.savedView.name, "Awaiting Payment");
  assert.deepEqual(classifySavedWorkViewState(saved.savedView.state), ["filters", "sorting", "columns", "layout"]);

  // Updating by same name (case-insensitive) updates existing entry
  const updated = saveWorkView(
    registrarStaff,
    "document_requests",
    {
      name: "awaiting payment",
      state: {
        statusFilters: ["PendingPayment"],
        visibleColumns: ["student_no", "student", "status"],
        sortBy: "created_at",
        sortOrder: "DESC",
        viewMode: "list",
      },
    },
    storage
  );
  assert.equal(updated.updated, true);
  assert.equal(updated.views.length, 1);
  assert.equal(updated.savedView.state.viewMode, "list");

  // Rename
  const renamed = renameSavedWorkView(registrarStaff, "document_requests", saved.savedView.id, "Payment Queue", storage);
  assert.equal(renamed.renamed, true);
  assert.equal(readSavedWorkViews(registrarStaff, "document_requests", storage)[0].name, "Payment Queue");

  // Isolated per user/office
  assert.equal(readSavedWorkViews(osasStaff, "document_requests", storage).length, 0);
  const allForReg = listAllSavedWorkViewsForUser(registrarStaff, storage);
  assert.equal(allForReg.length, 1);
  assert.equal(allForReg[0].page.id, "document_requests");
  assert.equal(allForReg[0].views[0].name, "Payment Queue");

  // Delete
  const remaining = deleteSavedWorkView(registrarStaff, "document_requests", saved.savedView.id, storage);
  assert.equal(remaining.length, 0);
  assert.equal(listAllSavedWorkViewsForUser(registrarStaff, storage).length, 0);
});

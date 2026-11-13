import test from "node:test";
import assert from "node:assert/strict";
import { createViewPreferenceStore, normalizeViewPreference, viewPreferenceKey } from "../src/lib/viewPreferences.js";

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
  assert.deepEqual(store.read("view", fallback, normalize), ["name"]);
  assert.deepEqual(normalize(["obsolete-only"]), fallback);
  assert.deepEqual(normalize(null), fallback);
  assert.deepEqual(normalize([]), []);
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
  assert.deepEqual(normalizeViewPreference("offices", "visibleColumns", ["status"], []), ["department", "status"]);
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
    staffCode.includes('["name", "email", "office", "role", "section", "totp_enabled"]'),
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

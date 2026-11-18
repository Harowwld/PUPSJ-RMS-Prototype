import { normalizeRole } from "./roleUtils.js";

const portalAccountColumns = ["name", "email", "affiliation", "status", "studentNo", "createdAt"];
const columns = {
  "portal-accounts": portalAccountColumns,
  offices: ["department", "office", "station", "staff", "modules", "status", "created_at", "updated_at"],
  staff: ["id", "name", "email", "office", "role", "section", "last_active", "totp_enabled", "created_at", "updated_at"],
  operations: ["id", "department", "requester", "title", "details", "status", "slaStatus", "submitted", "updatedAt"],
  logs: ["created_at", "severity", "actor", "action", "office_id", "details", "ip"],
  backups: ["filename", "size", "created", "actor", "type", "status"],
};
const previouslyFixedColumns = {
  staff: ["id"],
  operations: ["id"],
  logs: ["created_at", "action"],
  backups: ["filename"],
};
const enums = {
  statusFilter: ["Active", "Inactive", "Archived"],
  officeFilter: ["Active", "Archived"],
  lifecycle: ["all", "open", "closed"],
  severity: ["All", "INFO", "WARNING", "CRITICAL"],
  scope: ["all", "required", "optional"],
  layoutView: ["grid", "table", "list"],
  viewMode: ["office", "matrix", "table", "list"],
  sortOrder: ["ASC", "DESC"],
  matrixSortOrder: ["ASC", "DESC"],
};
const sortKeys = {
  "portal-accounts": portalAccountColumns,
  offices: ["short_name", "name", "station_name", "staff_count", "module_count", "status", "created_at", "updated_at"],
  staff: ["name", "id", "email", "office", "role", "section", "last_active", "totp_enabled", "created_at", "updated_at"],
  operations: ["createdAt", "id", "officeId", "studentName", "title", "organizationName", "status", "slaStatus", "updatedAt"],
  logs: ["created_at", "severity", "actor", "office_id", "action"],
  backups: ["created_at", "filename", "size_bytes", "actor", "backup_type", "status_local"],
};
const groups = {
  offices: ["none", "status", "station", "staff_count"],
  staff: ["none", "office", "role"],
  operations: ["none", "department", "status"],
  "portal-accounts": ["none", "affiliation", "status"],
  logs: ["none", "role", "severity"],
  backups: ["none", "backup_type", "status_local"],
};
const ruleFields = {
  offices: ["short_name", "name", "station_name", "staff_count", "module_count"],
  staff: ["role", "office"],
  operations: ["department", "status", "queue_risk"],
  "portal-accounts": ["affiliation", "status"],
  backups: ["status_local", "size_bytes"],
  modules: ["category", "required", "status"],
  "cms-faq": ["category"],
  logs: ["office", "role", "severity"],
  activity: ["severity"],
  compliance: ["courseCode", "percent", "total", "digitized"],
};
const strings = (value) => Array.isArray(value) && value.length <= 100 && value.every((item) => typeof item === "string" && item.length <= 5000);

export function viewPreferenceKey(user, page, field) {
  if (!user?.id || !["superadmin", "systemadmin"].includes(String(user.role).toLowerCase())) return null;
  return `pup_superadmin_view_v2:${encodeURIComponent(String(user.id))}:${page}:${field}`;
}

export function workspaceViewPreferenceKey(user, page, field, { preserveOsasKey = false } = {}) {
  const role = normalizeRole(user?.role);
  const accountId = role === "Student" ? user?.account_id ?? user?.id : user?.id;
  if (!accountId || !role) return null;
  const office = String(user.office_id || "").trim().toLowerCase();
  const id = encodeURIComponent(String(accountId));
  if (preserveOsasKey && office === "osas" && (role === "Admin" || role === "Staff")) {
    return `pup_osas_view_v1:${id}:${page}:${field}`;
  }
  if (preserveOsasKey && !/(?:^|\.)(?:viewMode|filterRules|visibleColumns|groupBy|(?:folder|record|table)?sort(?:By|Order))$/i.test(field)) {
    return null;
  }
  return `pup_workspace_view_v1:${role}:${encodeURIComponent(office)}:${id}:${page}:${field}`;
}

export function normalizeViewPreference(page, field, value, fallback) {
  if (field === "activeTab") {
    const tabs = {
      "cms-hero": ["slides", "preview"],
      "cms-bento": ["cards", "header", "preview"],
    }[page] || ["content", "preview"];
    return tabs.includes(value) ? value : fallback;
  }
  if (field === "visibleColumns" && columns[page]) {
    if (!strings(value)) return fallback;
    const selected = [...new Set(value.filter((key) => columns[page].includes(key)))];
    if (value.length && !selected.length) return fallback;
    for (const key of fallback) {
      if (selected.length >= 2) break;
      if (!selected.includes(key)) selected.push(key);
    }
    return selected;
  }
  const allowed = enums[field] || (field === "sortBy" ? sortKeys[page] : field === "groupBy" ? groups[page] : null);
  if (allowed) return allowed.includes(value) ? value : fallback;
  if (field === "matrixSortBy") return ["name", "required"].includes(value) ? value : fallback;
  if (field === "matrixGroupBy") return ["none", "category", "required"].includes(value) ? value : fallback;
  if (["pageSize", "itemsPerPage", "limit", "perPage"].includes(field)) return [10, 20, 50, 100].includes(value) ? value : fallback;
  if (/Date$/.test(field)) {
    return typeof value === "string" && (value === "" || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value)) ? value : fallback;
  }
  if (["filterRules", "filterClauses", "operationFilters", "categoryFilters"].includes(field)) {
    if (!Array.isArray(value) || value.length > 100) return fallback;
    const ids = new Set();
    return value.filter((rule) => {
      if (!rule || typeof rule.id !== "string" || ids.has(rule.id) || !ruleFields[page]?.includes(rule.fieldKey)) return false;
      if (!["is", "is_not", "greater_than", "less_than"].includes(rule.operator)) return false;
      if (!(typeof rule.value === "string" || (typeof rule.value === "number" && Number.isFinite(rule.value)) || strings(rule.value))) return false;
      ids.add(rule.id);
      return true;
    }).map(({ id, fieldKey, operator, value: ruleValue }) => ({ id, fieldKey, operator, value: ruleValue }));
  }
  if (field === "staffFilters" || field === "logFilters") {
    if (!value || typeof value !== "object" || !Object.keys(fallback).every((key) => strings(value[key]))) return fallback;
    return Object.fromEntries(Object.keys(fallback).map((key) => [key, [...new Set(value[key])]]));
  }
  if (Array.isArray(fallback)) return strings(value) ? [...new Set(value)] : fallback;
  if (typeof fallback === "string") return typeof value === "string" && value.length <= 5000 ? value : fallback;
  if (typeof fallback === "boolean") return typeof value === "boolean" ? value : fallback;
  return fallback;
}

export function restoreViewPreference(page, field, value, fallback) {
  if (field === "visibleColumns" && previouslyFixedColumns[page]) {
    // Older saves omitted columns that were always rendered.
    value = strings(value) ? [...previouslyFixedColumns[page], ...value] : value?.selected;
  }
  return normalizeViewPreference(page, field, value, fallback);
}

export function serializeViewPreference(page, field, value) {
  return field === "visibleColumns" && previouslyFixedColumns[page] ? { selected: value } : value;
}

const registeredStores = new Set();

export function notifyViewPreferenceKeysRemoved(keys) {
  const keySet = keys instanceof Set ? keys : new Set(keys);
  if (!keySet.size) return;
  for (const store of registeredStores) {
    store.invalidate(keySet);
  }
}

export function createViewPreferenceStore(getStorage) {
  const cache = new Map();
  const listeners = new Map();
  const emit = (key) => listeners.get(key)?.forEach((listener) => listener());
  const store = {
    read(key, fallback, normalize) {
      if (!key) return fallback;
      const previous = cache.get(key);
      try {
        const storage = getStorage();
        if (previous?.unsaved) {
          storage.setItem(key, previous.raw);
          previous.unsaved = false;
        }
        const raw = storage.getItem(key);
        if (previous && previous.raw === raw) return previous.value;
        let value = fallback;
        if (raw !== null) {
          try { value = normalize(JSON.parse(raw)); } catch { /* Invalid saved data uses the page defaults. */ }
        }
        cache.set(key, { raw, value });
        return value;
      } catch {
        return previous?.value ?? fallback;
      }
    },
    write(key, value, storedValue = value) {
      if (!key) return;
      const raw = JSON.stringify(storedValue);
      let unsaved = false;
      try { getStorage().setItem(key, raw); } catch { unsaved = true; }
      cache.set(key, { raw, value, unsaved });
      emit(key);
    },
    remove(key) {
      if (!key) return;
      try { getStorage().removeItem(key); } catch { /* Ignore storage errors. */ }
      cache.delete(key);
      emit(key);
    },
    invalidate(keys) {
      for (const key of keys) {
        if (cache.has(key) || listeners.has(key)) {
          cache.delete(key);
          emit(key);
        }
      }
    },
    subscribe(key, callback) {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(callback);
      return () => {
        listeners.get(key)?.delete(callback);
        if (!listeners.get(key)?.size) listeners.delete(key);
      };
    },
  };
  registeredStores.add(store);
  return store;
}

export const SAVED_VIEW_CATEGORIES = [
  { id: "filters", label: "Filters" },
  { id: "sorting", label: "Sorting" },
  { id: "grouping", label: "Grouping" },
  { id: "columns", label: "Columns" },
  { id: "layout", label: "Layout" },
];

export function classifyViewPreferenceField(field) {
  const fieldName = String(field || "").split(".").at(-1);
  if (fieldName === "visibleColumns") return "columns";
  if (/groupBy$/i.test(fieldName)) return "grouping";
  if (/sort/i.test(fieldName)) return "sorting";
  if (
    /^(?:viewMode|layoutView|pageSize|itemsPerPage|limit|perPage|roomsPerPage|activeTab|activeStream|currentLevel|currentLocatorLevel|selectedCategory|selectedYear|selectedRoom|selectedCabinet|selectedOfficeId|activeRoomId|is3D|showPagesSidebar|automaticScheduleExpanded|previewDarkTheme|feedbackMinimized|testCabinetRoutes|testRouteTarget)$/i.test(
      fieldName
    )
  ) {
    return "layout";
  }
  return "filters";
}

export function getSavedViewPagesForUser(user) {
  if (!user) return [];
  const role = normalizeRole(user.role);
  const rawRole = String(user.role || "").toLowerCase();
  const office = String(user.office_id || "").trim().toLowerCase();
  const isOsas = office === "osas" || String(user.section || "").toUpperCase() === "OSAS";

  if (role === "Student") {
    const pages = [
      { id: "student_requests", label: "Document Requests", pageKeys: ["student_requests"] },
    ];
    if (user.client_type === "Student" && user.portal_setup_complete !== false) {
      pages.push(
        { id: "student_compliance", label: "Document Checklist", pageKeys: ["student_compliance"] },
        {
          id: "student_osas",
          label: "Student Organizations",
          pageKeys: ["student_osas", "student_proposals", "student_post_events", "student_cbl"],
        }
      );
    }
    return pages;
  }

  if (rawRole === "superadmin" || rawRole === "systemadmin") {
    return [
      { id: "operations", label: "Campus Operations", pageKeys: ["operations"] },
      { id: "offices", label: "Departments & Stations", pageKeys: ["offices"] },
      { id: "modules", label: "Department Features", pageKeys: ["modules"] },
      {
        id: "landing",
        label: "Landing Page CMS",
        pageKeys: ["cms-hero", "cms-bento", "cms-catalog", "cms-workflow", "cms-faq", "cms-footer"],
      },
      { id: "staff", label: "Global Directory", pageKeys: ["staff"] },
      { id: "portal-accounts", label: "Portal Accounts", pageKeys: ["portal-accounts"] },
      { id: "security", label: "Security Questions", pageKeys: ["security"] },
      { id: "logs", label: "Platform Activity History", pageKeys: ["logs"] },
      { id: "backups", label: "Platform Backups", pageKeys: ["backups"] },
      { id: "personnel-activity", label: "Personnel Activity", pageKeys: ["personnel-activity"] },
      { id: "activity", label: "My Activity", pageKeys: ["activity"] },
    ];
  }

  if (role === "Admin") {
    return [
      { id: "digital_records_review", label: "Records Review", pageKeys: ["digital_records_review"] },
      {
        id: "digitization_compliance",
        label: "Compliance Analytics",
        pageKeys: isOsas ? ["digitization_compliance", "organization_compliance"] : ["digitization_compliance"],
      },
      { id: "sla_analytics", label: "SLA Analytics", pageKeys: ["sla_analytics"] },
      { id: "storage_layout_editor", label: "Storage Room Layout", pageKeys: ["storage_layout_editor"] },
      { id: "staff_directory", label: "Staff Directory", pageKeys: ["staff_directory"] },
      { id: "audit_logs", label: "Activity History", pageKeys: ["audit_logs"] },
      { id: "system_configuration", label: "System Configuration", pageKeys: ["system_configuration"] },
      { id: "office_backups", label: "Backup & Recovery", pageKeys: ["office_backups"] },
    ];
  }

  if (role === "Staff" && isOsas) {
    return [
      { id: "osas_monitoring", label: "Organization Monitoring", pageKeys: ["osas_monitoring"] },
      { id: "student_organizations", label: "Student Organizations", pageKeys: ["student_organizations"] },
      { id: "documents", label: "Office Documents", pageKeys: ["documents", "office_documents"] },
      { id: "document_requests", label: "Document Requests", pageKeys: ["document_requests"] },
      { id: "notifications", label: "Notifications", pageKeys: ["notifications"] },
    ];
  }

  if (role === "Staff") {
    return [
      { id: "document_requests", label: "Document Requests", pageKeys: ["document_requests"] },
      { id: "scan_upload", label: "Scan & Upload", pageKeys: ["scan_upload"] },
      { id: "batch_review", label: "Batch Review", pageKeys: ["batch_review"] },
      { id: "student_directory", label: "Student Directory", pageKeys: ["student_directory"] },
      { id: "records_archive", label: "Records & Archive", pageKeys: ["records_archive", "archive_files"] },
      { id: "storage_explorer", label: "Storage Explorer", pageKeys: ["storage_explorer"] },
      { id: "documents", label: "Student Documents", pageKeys: ["documents"] },
      { id: "notifications", label: "Notifications", pageKeys: ["notifications"] },
    ];
  }

  return [];
}

function getStorageKeys(storage) {
  if (!storage) return [];
  if (typeof storage.length === "number" && typeof storage.key === "function") {
    const keys = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (typeof k === "string") keys.push(k);
    }
    return keys;
  }
  return [];
}

function getPagePrefixesForUser(user, pageKeys) {
  if (!user || !Array.isArray(pageKeys) || !pageKeys.length) return [];
  const role = normalizeRole(user.role);
  const rawRole = String(user.role || "").toLowerCase();
  const accountId = role === "Student" ? user.account_id ?? user.id : user.id;
  if (!accountId || !role) return [];
  const office = String(user.office_id || "").trim().toLowerCase();
  const id = encodeURIComponent(String(accountId));
  const encodedOffice = encodeURIComponent(office);
  const isSuperAdmin = rawRole === "superadmin" || rawRole === "systemadmin";
  const isOsasAdminOrStaff = office === "osas" && (role === "Admin" || role === "Staff");

  const prefixes = [];
  for (const page of pageKeys) {
    if (isSuperAdmin) {
      prefixes.push(`pup_superadmin_view_v2:${encodeURIComponent(String(user.id))}:${page}:`);
    }
    prefixes.push(`pup_workspace_view_v1:${role}:${encodedOffice}:${id}:${page}:`);
    if (isOsasAdminOrStaff) {
      prefixes.push(`pup_osas_view_v1:${id}:${page}:`);
    }
  }
  return prefixes;
}

export function inspectSavedViewForPage(user, pageOrKeys, storage) {
  const pageKeys = Array.isArray(pageOrKeys) ? pageOrKeys : pageOrKeys?.pageKeys || (pageOrKeys ? [pageOrKeys] : []);
  if (!user || !pageKeys.length || !storage) return { keys: [], categories: [] };

  const prefixes = getPagePrefixesForUser(user, pageKeys);
  const allKeys = getStorageKeys(storage);
  const matchedKeys = [];
  const categorySet = new Set();

  for (const key of allKeys) {
    const matchedPrefix = prefixes.find((prefix) => key.startsWith(prefix));
    if (matchedPrefix) {
      const field = key.slice(matchedPrefix.length);
      matchedKeys.push(key);
      categorySet.add(classifyViewPreferenceField(field));
    }
  }

  if (pageKeys.includes("staff_directory")) {
    try {
      if (storage.getItem("staffDir_search") !== null) {
        matchedKeys.push("staffDir_search");
        categorySet.add("filters");
      }
    } catch {
      // Ignore storage access errors.
    }
  }

  const categories = SAVED_VIEW_CATEGORIES.map((c) => c.id).filter((id) => categorySet.has(id));
  return { keys: matchedKeys, categories };
}

export function resetSavedViewForPage(user, pageOrKeys, storage) {
  const { keys, categories } = inspectSavedViewForPage(user, pageOrKeys, storage);
  if (!keys.length || !storage) return { removedCount: 0, categories: [] };
  for (const key of keys) {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage removal errors.
    }
  }
  notifyViewPreferenceKeysRemoved(keys);
  return { removedCount: keys.length, categories };
}

export function resetAllSavedViewsForUser(user, storage) {
  const pages = getSavedViewPagesForUser(user);
  if (!pages.length || !storage) return { removedCount: 0, pageCount: 0 };
  const allKeys = new Set();
  let pageCount = 0;
  for (const page of pages) {
    const { keys } = inspectSavedViewForPage(user, page, storage);
    if (keys.length > 0) {
      pageCount += 1;
      for (const key of keys) allKeys.add(key);
    }
  }
  if (!allKeys.size) return { removedCount: 0, pageCount: 0 };
  for (const key of allKeys) {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage removal errors.
    }
  }
  notifyViewPreferenceKeysRemoved(allKeys);
  return { removedCount: allKeys.size, pageCount };
}

const savedWorkViewListeners = new Map();

export function subscribeSavedWorkViews(key, callback) {
  if (!key || typeof callback !== "function") return () => {};
  if (!savedWorkViewListeners.has(key)) savedWorkViewListeners.set(key, new Set());
  savedWorkViewListeners.get(key).add(callback);
  return () => {
    savedWorkViewListeners.get(key)?.delete(callback);
    if (!savedWorkViewListeners.get(key)?.size) savedWorkViewListeners.delete(key);
  };
}

function emitSavedWorkViews(key) {
  savedWorkViewListeners.get(key)?.forEach((listener) => listener());
}

export function savedWorkViewsKey(user, page) {
  const role = normalizeRole(user?.role);
  const accountId = role === "Student" ? user?.account_id ?? user?.id : user?.id;
  if (!accountId || !role || !page) return null;
  const office = String(user.office_id || "").trim().toLowerCase();
  const id = encodeURIComponent(String(accountId));
  return `pup_saved_work_views_v1:${role}:${encodeURIComponent(office)}:${id}:${page}`;
}

export function classifySavedWorkViewState(state) {
  if (!state || typeof state !== "object") return [];
  const categorySet = new Set();
  for (const key of Object.keys(state)) {
    categorySet.add(classifyViewPreferenceField(key));
  }
  return SAVED_VIEW_CATEGORIES.map((c) => c.id).filter((id) => categorySet.has(id));
}

function normalizeSavedWorkViewsList(rawList) {
  if (!Array.isArray(rawList)) return [];
  const seenIds = new Set();
  const seenNames = new Set();
  const valid = [];
  for (const item of rawList) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : null;
    const name = typeof item.name === "string" ? item.name.trim().slice(0, 60) : "";
    if (!id || !name || seenIds.has(id) || seenNames.has(name.toLowerCase())) continue;
    if (!item.state || typeof item.state !== "object" || Array.isArray(item.state)) continue;
    seenIds.add(id);
    seenNames.add(name.toLowerCase());
    valid.push({
      id,
      name,
      state: item.state,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
    });
    if (valid.length >= 25) break;
  }
  return valid;
}

export function readSavedWorkViews(user, page, storage) {
  const key = savedWorkViewsKey(user, page);
  if (!key || !storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    return normalizeSavedWorkViewsList(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeSavedWorkViews(user, page, views, storage) {
  const key = savedWorkViewsKey(user, page);
  if (!key || !storage) return [];
  const normalized = normalizeSavedWorkViewsList(views);
  try {
    if (normalized.length === 0) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(normalized));
  } catch {
    // Ignore storage errors.
  }
  emitSavedWorkViews(key);
  return normalized;
}

export function saveWorkView(user, page, { name, state }, storage) {
  const cleanName = typeof name === "string" ? name.trim().slice(0, 60) : "";
  if (!cleanName || !state || typeof state !== "object" || Array.isArray(state) || !storage) {
    return { views: readSavedWorkViews(user, page, storage), savedView: null, updated: false };
  }
  const existing = readSavedWorkViews(user, page, storage);
  const now = new Date().toISOString();
  const matchIndex = existing.findIndex((v) => v.name.toLowerCase() === cleanName.toLowerCase());
  let savedView;
  let updated = false;
  let nextViews;
  if (matchIndex >= 0) {
    updated = true;
    savedView = { ...existing[matchIndex], name: cleanName, state, updatedAt: now };
    nextViews = existing.map((v, idx) => (idx === matchIndex ? savedView : v));
  } else {
    const id = `view-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    savedView = { id, name: cleanName, state, createdAt: now, updatedAt: now };
    nextViews = [savedView, ...existing].slice(0, 25);
  }
  const written = writeSavedWorkViews(user, page, nextViews, storage);
  return { views: written, savedView, updated };
}

export function renameSavedWorkView(user, page, viewId, nextName, storage) {
  const cleanName = typeof nextName === "string" ? nextName.trim().slice(0, 60) : "";
  if (!cleanName || !viewId || !storage) return { views: readSavedWorkViews(user, page, storage), renamed: false };
  const existing = readSavedWorkViews(user, page, storage);
  if (existing.some((v) => v.id !== viewId && v.name.toLowerCase() === cleanName.toLowerCase())) {
    return { views: existing, renamed: false, duplicate: true };
  }
  let renamed = false;
  const now = new Date().toISOString();
  const nextViews = existing.map((v) => {
    if (v.id !== viewId) return v;
    renamed = true;
    return { ...v, name: cleanName, updatedAt: now };
  });
  if (!renamed) return { views: existing, renamed: false };
  return { views: writeSavedWorkViews(user, page, nextViews, storage), renamed: true };
}

export function deleteSavedWorkView(user, page, viewId, storage) {
  if (!viewId || !storage) return readSavedWorkViews(user, page, storage);
  const existing = readSavedWorkViews(user, page, storage);
  const nextViews = existing.filter((v) => v.id !== viewId);
  if (nextViews.length === existing.length) return existing;
  return writeSavedWorkViews(user, page, nextViews, storage);
}

export function listAllSavedWorkViewsForUser(user, storage) {
  const pages = getSavedViewPagesForUser(user);
  if (!pages.length || !storage) return [];
  const results = [];
  for (const pageDef of pages) {
    const views = [];
    for (const pageKey of pageDef.pageKeys) {
      for (const view of readSavedWorkViews(user, pageKey, storage)) {
        views.push({ ...view, pageKey });
      }
    }
    if (views.length > 0) {
      results.push({ page: pageDef, views });
    }
  }
  return results;
}

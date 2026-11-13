const columns = {
  offices: ["department", "office", "station", "staff", "modules", "status", "created_at", "updated_at"],
  staff: ["name", "email", "office", "role", "section", "last_active", "totp_enabled", "created_at", "updated_at"],
  operations: ["department", "requester", "title", "details", "status", "slaStatus", "submitted", "updatedAt"],
  logs: ["severity", "actor", "office_id", "details", "ip"],
  backups: ["size", "created", "actor", "type", "status", "external", "offsite"],
};
const enums = {
  statusFilter: ["Active", "Inactive", "Archived"],
  officeFilter: ["Active", "Archived"],
  lifecycle: ["all", "open", "closed"],
  scope: ["all", "required", "optional"],
  layoutView: ["grid", "table", "list"],
  viewMode: ["office", "matrix", "table", "list"],
  sortOrder: ["ASC", "DESC"],
  matrixSortOrder: ["ASC", "DESC"],
};
const sortKeys = {
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
  backups: ["none", "backup_type", "status_local"],
};
const ruleFields = {
  offices: ["short_name", "name", "station_name", "staff_count", "module_count"],
  staff: ["role", "office"],
  operations: ["department", "status"],
  backups: ["status_local", "size_bytes"],
  modules: ["category", "required", "status"],
  "cms-faq": ["category"],
  logs: ["office", "role", "severity"],
  activity: ["severity"],
};
const strings = (value) => Array.isArray(value) && value.length <= 100 && value.every((item) => typeof item === "string" && item.length <= 5000);

export function viewPreferenceKey(user, page, field) {
  if (!user?.id || !["superadmin", "systemadmin"].includes(String(user.role).toLowerCase())) return null;
  return `pup_superadmin_view_v2:${encodeURIComponent(String(user.id))}:${page}:${field}`;
}

export function normalizeViewPreference(page, field, value, fallback) {
  if (field === "activeTab") {
    const tabs = page === "cms-hero" ? ["slides", "preview"] : ["content", "preview"];
    return tabs.includes(value) ? value : fallback;
  }
  if (field === "visibleColumns" && columns[page]) {
    if (!strings(value)) return fallback;
    const selected = [...new Set(value.filter((key) => columns[page].includes(key)))];
    if (value.length && !selected.length) return fallback;
    return page === "offices" ? ["department", ...selected.filter((key) => key !== "department")] : selected;
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

export function createViewPreferenceStore(getStorage) {
  const cache = new Map();
  const listeners = new Map();
  const emit = (key) => listeners.get(key)?.forEach((listener) => listener());
  return {
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
    write(key, value) {
      if (!key) return;
      const raw = JSON.stringify(value);
      let unsaved = false;
      try { getStorage().setItem(key, raw); } catch { unsaved = true; }
      cache.set(key, { raw, value, unsaved });
      emit(key);
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
}

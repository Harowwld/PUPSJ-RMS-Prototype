"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useAuthUser } from "@/components/shared/AuthGuard";
import { createViewPreferenceStore } from "@/lib/viewPreferences";

const store = createViewPreferenceStore(() => window.localStorage);
const allowedValues = {
  osas_monitoring: {
    activeStream: ["proposals", "post_events"],
    viewMode: ["list", "table", "kanban"],
    groupBy: ["status", "organization", "none"],
    tableSortOrder: ["ASC", "DESC"],
  },
  student_organizations: {
    viewMode: ["grid", "table"],
    sortOrder: ["ASC", "DESC"],
  },
  records_archive: {
    viewMode: ["folders", "master-list"],
    folderSortOrder: ["ASC", "DESC"],
    recordSortOrder: ["ASC", "DESC"],
  },
  storage_explorer: {
    currentLocatorLevel: ["rooms", "cabinets", "drawers"],
  },
  documents: {
    statusFilter: ["all", "incomplete", "compliant"],
    sortOrder: ["ASC", "DESC"],
  },
  notifications: {
    activeTab: ["unread", "read"],
    sortOrder: ["ASC", "DESC"],
  },
  document_requests: {
    viewMode: ["list", "table", "kanban"],
    sortOrder: ["ASC", "DESC"],
  },
  student_directory: {
    activeTab: ["active", "archived"],
    sortOrder: ["ASC", "DESC"],
  },
};

function isRule(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (typeof value.id === "string" || typeof value.id === "number") &&
      typeof value.fieldKey === "string" &&
      typeof value.operator === "string" &&
      Object.prototype.hasOwnProperty.call(value, "value")
  );
}

function normalizePreference(value, fallback, page, field) {
  const fieldName = field.split(".").at(-1);
  const allowed = allowedValues[page]?.[fieldName];
  if (allowed && !allowed.includes(value)) return fallback;

  if (fallback === null) {
    return value === null || typeof value === "string" || (typeof value === "number" && Number.isFinite(value))
      ? value
      : fallback;
  }
  if (typeof fallback === "string") {
    if (typeof value !== "string" || value.length > 5000) return fallback;
    if (field.endsWith("Date") && value !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
    return value;
  }
  if (typeof fallback === "number") {
    const minimum = field === "overlayOpacity" ? 0 : 1;
    return typeof value === "number" && Number.isFinite(value) && value >= minimum ? value : fallback;
  }
  if (typeof fallback === "boolean") return typeof value === "boolean" ? value : fallback;
  if (Array.isArray(fallback)) {
    if (!Array.isArray(value) || value.length > 100) return fallback;
    if (value.length === 0) return [];
    if (value.every((item) =>
      typeof item === "string" || typeof item === "boolean" || (typeof item === "number" && Number.isFinite(item))
    )) return [...new Set(value)];
    if (value.every(isRule)) return value;
    return fallback;
  }
  return fallback;
}

export default function useOsasViewPreference(page, field, initialValue, { legacyKey = null } = {}) {
  const user = useAuthUser();
  const officeId = String(user?.office_id || "").trim().toLowerCase();
  const key = user?.id && officeId === "osas"
    ? `pup_osas_view_v1:${encodeURIComponent(String(user.id))}:${page}:${field}`
    : null;
  const fallback = useRef(initialValue);
  const normalize = useCallback((value) => normalizePreference(value, fallback.current, page, field), [field, page]);

  const subscribe = useCallback((callback) => {
    const unsubscribe = store.subscribe(key, callback);
    const sync = (event) => {
      if (event.key === key || event.key === null) callback();
    };
    window.addEventListener("storage", sync);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", sync);
    };
  }, [key]);
  const getSnapshot = useCallback(() => store.read(key, fallback.current, normalize), [key, normalize]);
  const getServerSnapshot = useCallback(() => fallback.current, []);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const transient = useRef(initialValue);
  const transientListeners = useRef(new Set());
  const subscribeTransient = useCallback((callback) => {
    transientListeners.current.add(callback);
    return () => transientListeners.current.delete(callback);
  }, []);
  const getTransient = useCallback(() => transient.current, []);
  const transientValue = useSyncExternalStore(subscribeTransient, getTransient, getServerSnapshot);

  const setValue = useCallback((next) => {
    const current = key ? store.read(key, fallback.current, normalize) : transient.current;
    const updated = normalize(typeof next === "function" ? next(current) : next);
    if (key) store.write(key, updated);
    else {
      transient.current = updated;
      transientListeners.current.forEach((listener) => listener());
    }
  }, [key, normalize]);

  useEffect(() => {
    if (!key || !legacyKey) return;
    try {
      if (window.localStorage.getItem(key) !== null) return;
      const legacyKeys = Array.isArray(legacyKey) ? legacyKey : [legacyKey];
      for (const oldKey of legacyKeys) {
        const raw = window.localStorage.getItem(oldKey);
        if (raw === null) continue;
        let storedValue;
        try {
          storedValue = JSON.parse(raw);
        } catch {
          storedValue = raw;
        }
        const normalized = normalize(storedValue);
        if (normalized !== fallback.current) {
          store.write(key, normalized);
          return;
        }
      }
    } catch {
      // Invalid or unavailable legacy preferences use the page defaults.
    }
  }, [key, legacyKey, normalize]);

  return [key ? value : transientValue, setValue];
}

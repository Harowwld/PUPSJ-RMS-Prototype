"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { useAuthUser } from "@/components/shared/AuthGuard";
import { createViewPreferenceStore, normalizeViewPreference, viewPreferenceKey } from "@/lib/viewPreferences";

const store = createViewPreferenceStore(() => window.localStorage);

export default function useViewPreference(page, field, initialValue) {
  const user = useAuthUser();
  const key = viewPreferenceKey(user, page, field);
  const fallback = useRef(initialValue);
  const normalize = useCallback((value) => normalizeViewPreference(page, field, value, fallback.current), [page, field]);
  const subscribe = useCallback((callback) => {
    const unsubscribe = store.subscribe(key, callback);
    const sync = (event) => { if (event.key === key || event.key === null) callback(); };
    window.addEventListener("storage", sync);
    return () => { unsubscribe(); window.removeEventListener("storage", sync); };
  }, [key]);
  const getSnapshot = useCallback(() => store.read(key, fallback.current, normalize), [key, normalize]);
  const getServerSnapshot = useCallback(() => fallback.current, []);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Keep this hook usable on shared panels outside the SuperAdmin portal.
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
    else { transient.current = updated; transientListeners.current.forEach((listener) => listener()); }
  }, [key, normalize]);
  return [key ? value : transientValue, setValue];
}

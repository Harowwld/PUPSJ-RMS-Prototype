"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getClientSession, subscribeClientPrincipal } from "@/lib/clientAuth";
import { normalizeTableDensity, tablePreferenceKey, TABLE_DENSITIES } from "@/lib/tablePresentation";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TablePreferencesContext = createContext({ density: "normal", setDensity: () => {}, ready: false });

function readDensity(key) {
  try { return key ? normalizeTableDensity(localStorage.getItem(key)) : "normal"; }
  catch { return "normal"; }
}

export function TablePreferencesProvider({ children, user }) {
  const [preference, setPreference] = useState({ key: null, density: "normal" });
  useEffect(() => {
    const selectUser = (principal) => {
      const key = tablePreferenceKey(principal);
      setPreference((previous) => previous.key === key ? previous : { key, density: readDensity(key) });
    };
    if (user !== undefined) {
      selectUser(user);
      return;
    }
    let active = true;
    const unsubscribe = subscribeClientPrincipal((principal) => { if (active) selectUser(principal); });
    getClientSession().then((session) => { if (active) selectUser(session.ok ? session.data : null); }).catch(() => {});
    return () => { active = false; unsubscribe(); };
  }, [user]);

  useEffect(() => {
    const sync = (event) => {
      if (event.key === preference.key || event.key === null) {
        setPreference((previous) => ({ ...previous, density: readDensity(previous.key) }));
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [preference.key]);

  const setDensity = (value) => {
    const density = normalizeTableDensity(value);
    if (!preference.key) return;
    try { localStorage.setItem(preference.key, density); } catch { /* Keep the current session usable when storage is unavailable. */ }
    setPreference({ key: preference.key, density });
  };

  return <TablePreferencesContext.Provider value={{ density: preference.density, setDensity, ready: Boolean(preference.key) }}>{children}</TablePreferencesContext.Provider>;
}

export function useTablePreferences() { return useContext(TablePreferencesContext); }

export function TableDensityControl({ className, label = "Row density" }) {
  const { density, setDensity, ready } = useTablePreferences();
  return (
    <div data-slot="table-density-control" className={cn("flex shrink-0 items-center gap-2", className)}>
      <span className="text-xs text-gray-600 dark:text-zinc-300">Density:</span>
      <Select
        aria-label={label}
        value={density}
        onChange={(event) => setDensity(event.target.value)}
        disabled={!ready}
        className="h-8 w-36 text-xs"
        options={Object.entries(TABLE_DENSITIES).map(([value, { label: name }]) => ({ value, label: name }))}
      />
    </div>
  );
}

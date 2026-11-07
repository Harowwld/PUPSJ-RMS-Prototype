"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getClientSession, subscribeClientPrincipal } from "@/lib/clientAuth";
import { normalizeTableDensity, tablePreferenceKey, TABLE_DENSITIES } from "@/lib/tablePresentation";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TablePreferencesContext = createContext({ density: "normal", setDensity: () => {}, ready: false });

function readDensity(key) {
  try {
    if (key && typeof window !== "undefined" && window.localStorage) {
      const val = localStorage.getItem(key);
      if (val) return normalizeTableDensity(val);
    }
    if (typeof window !== "undefined" && window.localStorage) {
      const globalVal = localStorage.getItem("pup_table_density");
      if (globalVal) return normalizeTableDensity(globalVal);
    }
    return "normal";
  } catch {
    return "normal";
  }
}

export function TablePreferencesProvider({ children, user }) {
  const [preference, setPreference] = useState(() => ({ key: null, density: "normal" }));
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
      if (event.key === preference.key || event.key === "pup_table_density" || event.key === null) {
        setPreference((previous) => ({ ...previous, density: readDensity(previous.key) }));
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [preference.key]);

  const setDensity = (value) => {
    const density = normalizeTableDensity(value);
    const key = preference.key || "pup_table_density";
    try {
      localStorage.setItem(key, density);
      localStorage.setItem("pup_table_density", density);
    } catch { /* Keep the current session usable when storage is unavailable. */ }
    setPreference((previous) => ({ ...previous, density }));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
    }
  };

  return <TablePreferencesContext.Provider value={{ density: preference.density, setDensity, ready: true }}>{children}</TablePreferencesContext.Provider>;
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
        onValueChange={(val) => setDensity(val)}
        disabled={!ready}
        className="h-8 w-36 text-xs"
        options={Object.entries(TABLE_DENSITIES).map(([value, { label: name }]) => ({ value, label: name }))}
      />
    </div>
  );
}

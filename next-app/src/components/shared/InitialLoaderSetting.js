"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { normalizeInitialLoader } from "@/lib/initialLoaderPreference";

export default function InitialLoaderSetting({ value, onSave }) {
  const [saving, setSaving] = useState(false);

  async function savePreference(nextValue) {
    setSaving(true);
    try {
      await onSave(nextValue);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:p-5 dark:border-white/[0.08] dark:bg-zinc-800">
      <div className="space-y-1">
        <h5 id="initial-loader-label" className="text-[13.5px] font-semibold text-gray-900 dark:text-zinc-50">
          Initial Dashboard Loader
        </h5>
        <p id="initial-loader-description" className="text-xs text-gray-500 dark:text-zinc-400">
          Choose what appears while your dashboard opens.
        </p>
      </div>
      <div className="w-full shrink-0 sm:w-72">
        <Select
          aria-labelledby="initial-loader-label"
          aria-describedby="initial-loader-description"
          value={normalizeInitialLoader(value)}
          disabled={saving}
          onValueChange={savePreference}
          buttonClassName="h-10 text-[13px] font-medium"
        >
          <option value="skeleton">Dashboard skeleton</option>
          <option value="workspace">Loading workspace…</option>
        </Select>
      </div>
    </div>
  );
}

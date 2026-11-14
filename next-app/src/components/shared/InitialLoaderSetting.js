"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WorkspaceLoaderMark } from "@/components/shared/WorkspaceLoading";
import { INITIAL_LOADER_OPTIONS, normalizeInitialLoader } from "@/lib/initialLoaderPreference";
import styles from "./WorkspaceLoading.module.css";

export default function InitialLoaderSetting({ value, onSave }) {
  const [saving, setSaving] = useState(false);
  const selected = normalizeInitialLoader(value);

  async function selectLoader(nextValue) {
    if (saving || nextValue === selected) return;

    setSaving(true);
    try {
      await onSave(nextValue);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-xs sm:p-5 dark:border-white/[0.08] dark:bg-zinc-800">
      <div className="space-y-1">
        <h5 id="initial-loader-label" className="text-[13.5px] font-semibold text-gray-900 dark:text-zinc-50">
          Initial Dashboard Loader
        </h5>
        <p id="initial-loader-description" className="text-xs text-gray-500 dark:text-zinc-400">
          Choose what appears while your dashboard opens.
        </p>
      </div>
      <div role="group" aria-labelledby="initial-loader-label" aria-describedby="initial-loader-description" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7.75rem),1fr))] gap-2">
        {INITIAL_LOADER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            className={`${styles.tile} h-auto min-h-24 w-full flex-col gap-2 whitespace-normal px-2 py-3 text-center aria-pressed:border-current aria-pressed:bg-muted`}
            aria-pressed={option.value === selected}
            aria-disabled={saving || undefined}
            onClick={() => selectLoader(option.value)}
          >
            {option.value === "skeleton" ? (
              <span aria-hidden="true" className={`${styles.skeleton} grid h-10 w-11 grid-cols-[10px_1fr] gap-1 rounded-md border border-current/30 p-1`}>
                <span className="rounded-sm bg-current/20" />
                <span className="flex flex-col gap-1">
                  <span className="h-1.5 rounded-sm bg-current/30" />
                  <span className="flex-1 rounded-sm bg-current/20" />
                </span>
              </span>
            ) : <WorkspaceLoaderMark variant={option.value} />}
            <span>{option.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

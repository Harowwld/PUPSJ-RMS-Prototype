"use client"

import { cn } from "@/lib/utils"

export default function LandingCmsDraftStatus({ isDirty }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-normal leading-4",
        isDirty
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
          : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
      )}
      role="status"
      aria-live="polite"
    >
      {isDirty ? "Unsaved changes · Previewing draft" : "All changes saved"}
    </span>
  )
}

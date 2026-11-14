"use client"

import { Alert02Icon, Tick01Icon } from "hugeicons-react"

export default function LandingCmsDraftStatus({ isDirty }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none"
      role="status"
      aria-live="polite"
    >
      {isDirty ? (
        <>
          <Alert02Icon size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-semibold text-gray-900 dark:text-zinc-100">Unsaved changes</span>
          <span className="h-3.5 w-px bg-black/[0.1] dark:bg-white/15 shrink-0" aria-hidden="true" />
          <span className="font-medium text-gray-500 dark:text-zinc-400">Previewing draft</span>
        </>
      ) : (
        <>
          <span className="size-3.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white inline-flex items-center justify-center shrink-0">
            <Tick01Icon size={8} className="stroke-[3]" />
          </span>
          <span className="font-semibold text-gray-900 dark:text-zinc-100">Status</span>
          <span className="h-3.5 w-px bg-black/[0.1] dark:bg-white/15 shrink-0" aria-hidden="true" />
          <span className="font-medium text-gray-500 dark:text-zinc-400">All changes saved</span>
        </>
      )}
    </span>
  )
}

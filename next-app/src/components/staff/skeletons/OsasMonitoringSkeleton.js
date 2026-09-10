"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function OsasMonitoringSkeleton() {
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[1fr_420px] animate-fade-up font-inter select-none">
      {/* Left Column: Proposals List */}
      <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card flex flex-col">
        <div className="space-y-1 mb-4">
          <Skeleton className="h-5 w-40 rounded dark:bg-muted" />
          <Skeleton className="h-3.5 w-64 rounded dark:bg-muted" />
        </div>

        {/* Subtabs: Active / Archive */}
        <div className="mb-4 flex gap-8 border-b border-gray-100 dark:border-white/5 pb-2">
          <Skeleton className="h-5 w-20 rounded dark:bg-muted" />
          <Skeleton className="h-5 w-20 rounded dark:bg-muted" />
        </div>

        {/* Proposal Rows */}
        <div className="space-y-2.5 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-brand border border-gray-200 p-3.5 dark:border-white/10"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-44 rounded dark:bg-muted" />
                  <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
                </div>
                <Skeleton className="h-3 w-36 rounded dark:bg-muted" />
              </div>
              <Skeleton className="h-8 w-16 rounded-lg dark:bg-muted shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* Right Column: Proposal Inspector & Canvas Preview */}
      <aside className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card flex flex-col justify-between">
        <div className="space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-48 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
          </div>

          {/* PDF First Page Preview Canvas Placeholder */}
          <div className="w-full h-48 rounded-lg border border-dashed border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/40 flex flex-col items-center justify-center p-4">
            <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted mb-2" />
            <Skeleton className="h-3 w-32 rounded dark:bg-muted" />
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <Skeleton className="h-9 w-full rounded-lg dark:bg-muted" />
            <Skeleton className="h-20 w-full rounded-lg dark:bg-muted" />
            <Skeleton className="h-9 w-full rounded-lg dark:bg-muted" />
          </div>

          {/* Updates Timeline placeholder */}
          <div className="border-l border-gray-200 dark:border-zinc-800 pl-3 space-y-2 pt-2">
            <Skeleton className="h-3 w-40 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-32 rounded dark:bg-muted" />
          </div>
        </div>
      </aside>
    </div>
  )
}

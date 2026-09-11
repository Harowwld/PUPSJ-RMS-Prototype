"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function SlaKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch relative z-20 w-full select-none">
      {/* KPI Card 1 */}
      <div className="relative overflow-hidden rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 p-4 h-full flex flex-col justify-between">
        <div className="space-y-1">
          <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
          <Skeleton className="h-7 w-20 rounded dark:bg-muted" />
          <Skeleton className="h-3.5 w-48 rounded dark:bg-muted mt-0.5" />
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
          <Skeleton className="h-full w-3/4 rounded-full dark:bg-muted" />
        </div>
      </div>

      {/* KPI Card 2 */}
      <div className="relative overflow-hidden rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 p-4 h-full flex flex-col justify-between">
        <div className="space-y-1">
          <Skeleton className="h-4 w-28 rounded dark:bg-muted" />
          <Skeleton className="h-7 w-20 rounded dark:bg-muted" />
          <Skeleton className="h-3.5 w-44 rounded dark:bg-muted mt-0.5" />
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
          <Skeleton className="h-full w-1/2 rounded-full dark:bg-muted" />
        </div>
      </div>
    </div>
  )
}

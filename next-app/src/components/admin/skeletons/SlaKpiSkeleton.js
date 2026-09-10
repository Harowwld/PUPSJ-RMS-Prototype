"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function SlaKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-stretch relative z-20 w-full select-none">
      {/* KPI Card 1 */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-card shadow-sm h-full flex flex-col justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
          <Skeleton className="h-10 w-24 rounded dark:bg-muted" />
          <Skeleton className="h-3.5 w-48 rounded dark:bg-muted mt-1" />
        </div>
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
          <Skeleton className="h-full w-3/4 rounded-full dark:bg-muted" />
        </div>
      </div>

      {/* KPI Card 2 */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-card shadow-sm h-full flex flex-col justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded dark:bg-muted" />
          <Skeleton className="h-10 w-28 rounded dark:bg-muted" />
          <Skeleton className="h-3.5 w-44 rounded dark:bg-muted mt-1" />
        </div>
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
          <Skeleton className="h-full w-1/2 rounded-full dark:bg-muted" />
        </div>
      </div>
    </div>
  )
}

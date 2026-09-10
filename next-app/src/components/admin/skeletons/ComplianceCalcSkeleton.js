"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function ComplianceCalcSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 py-4 w-full select-none animate-pulse">
      {/* Context & Formula */}
      <div className="flex-1">
        <div className="flex items-start gap-3">
          <Skeleton className="h-5 w-5 rounded mt-1 dark:bg-muted shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
            <Skeleton className="h-2.5 w-28 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-80 max-w-full rounded dark:bg-muted mt-2" />
          </div>
        </div>
      </div>

      {/* Progress Metrics Box */}
      <div className="w-full lg:w-[400px] shrink-0 space-y-3">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <Skeleton className="h-2.5 w-28 rounded dark:bg-muted" />
            <Skeleton className="h-7 w-36 rounded dark:bg-muted" />
          </div>
          <Skeleton className="h-4 w-20 rounded dark:bg-muted mb-1" />
        </div>
        {/* Progress bar track */}
        <div className="h-[8px] w-full rounded-[4px] bg-gray-100 dark:bg-zinc-800 overflow-hidden">
          <Skeleton className="h-full w-2/3 rounded-[4px] dark:bg-muted" />
        </div>
      </div>
    </div>
  )
}

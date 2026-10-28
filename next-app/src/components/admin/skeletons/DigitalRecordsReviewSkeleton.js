"use client"

import { Skeleton } from "@/components/ui/skeleton"
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton"
import RecordsReviewTableSkeleton from "@/components/admin/skeletons/RecordsReviewTableSkeleton"

export default function DigitalRecordsReviewSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col w-full gap-6 animate-fade-up select-none">
      {/* Main Container Card */}
      <div className="overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card flex flex-col flex-[1_0_auto] isolate font-jakarta">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-44 rounded dark:bg-muted" />
              <Skeleton className="h-3 w-64 rounded dark:bg-muted" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Top KPI Stat Cards */}
        <div className="px-6 pb-6">
          <KpiStatCardsSkeleton count={3} />
        </div>

        {/* Toolbar / Filter Row */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/40 dark:bg-zinc-900/30">
          <Skeleton className="h-9 w-64 rounded-xl dark:bg-muted" />
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-36 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-48 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Table Skeleton */}
        <RecordsReviewTableSkeleton rowCount={8} embedded={true} />
      </div>
    </div>
  )
}

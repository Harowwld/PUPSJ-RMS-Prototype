"use client"

import { Skeleton } from "@/components/ui/skeleton"
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton"
import RecordsReviewTableSkeleton from "@/components/admin/skeletons/RecordsReviewTableSkeleton"

export default function DigitalRecordsReviewSkeleton({ isOrganizationRecords = false }) {
  return (
    <div className="flex flex-[1_0_auto] flex-col w-full gap-6 animate-fade-up select-none">
      {/* Main Container Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card flex flex-col flex-[1_0_auto] isolate font-jakarta">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="space-y-2">
              <Skeleton className="h-[22px] w-44 max-w-full rounded dark:bg-muted" />
              <Skeleton className="h-4 w-64 max-w-full rounded dark:bg-muted" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Top KPI Stat Cards */}
        <div className="px-6 pb-6">
          <div className="p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
            <KpiStatCardsSkeleton count={3} />
          </div>
        </div>

        {/* Toolbar / Filter Row */}
        <div className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-card">
          <Skeleton className="h-9 w-64 rounded-xl dark:bg-muted" />
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-36 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-48 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Table Skeleton */}
        <RecordsReviewTableSkeleton rowCount={8} embedded={true} isOrganizationRecords={isOrganizationRecords} />
      </div>
    </div>
  )
}

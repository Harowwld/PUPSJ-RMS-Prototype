"use client"

import { Skeleton } from "@/components/ui/skeleton"
import SlaKpiSkeleton from "@/components/admin/skeletons/SlaKpiSkeleton"
import SlaChartsSkeleton from "@/components/admin/skeletons/SlaChartsSkeleton"

export default function SLAAnalyticsSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col w-full gap-6 animate-fade-up select-none font-jakarta">
      {/* Main Container Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card flex flex-col flex-[1_0_auto] isolate">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl dark:bg-muted" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40 rounded dark:bg-muted" />
              <Skeleton className="h-3 w-72 rounded dark:bg-muted" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-36 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Top KPI Stat Cards */}
        <div className="px-6 pb-6">
          <div className="p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
            <SlaKpiSkeleton />
          </div>
        </div>

        {/* Toolbar / Date Filter Skeleton */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-border dark:border-border bg-white dark:bg-card">
          <Skeleton className="h-8 w-64 rounded-full dark:bg-muted" />
          <Skeleton className="h-9 w-48 rounded-xl dark:bg-muted" />
        </div>

        {/* Charts Skeleton */}
        <div className="p-6 border-t border-border dark:border-border">
          <SlaChartsSkeleton />
        </div>
      </div>
    </div>
  )
}

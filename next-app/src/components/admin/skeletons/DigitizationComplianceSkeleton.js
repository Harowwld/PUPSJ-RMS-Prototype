"use client"

import { Skeleton } from "@/components/ui/skeleton"
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton"
import ComplianceTableSkeleton from "@/components/admin/skeletons/ComplianceTableSkeleton"

export default function DigitizationComplianceSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col w-full gap-6 animate-fade-up select-none font-jakarta">
      {/* Main Container Card */}
      <div className="overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card flex flex-col flex-[1_0_auto] isolate">
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
            <Skeleton className="h-10 w-28 rounded-xl dark:bg-muted" />
            <Skeleton className="h-10 w-36 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Top KPI Stat Cards */}
        <div className="px-6 pb-6">
          <KpiStatCardsSkeleton count={3} />
        </div>

        {/* Table Skeleton */}
        <ComplianceTableSkeleton rowCount={6} embedded={true} />
      </div>
    </div>
  )
}

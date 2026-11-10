"use client";

import { Skeleton } from "@/components/ui/skeleton";
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton";
import ComplianceCalcSkeleton from "@/components/admin/skeletons/ComplianceCalcSkeleton";
import ComplianceTableSkeleton from "@/components/admin/skeletons/ComplianceTableSkeleton";

export default function DigitizationComplianceSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col w-full gap-6 animate-fade-up select-none font-jakarta">
      {/* Main Container Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card flex flex-col flex-[1_0_auto] isolate">
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
            <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Top KPI Stat Cards */}
        <div className="px-6 pb-6">
          <div className="p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
            <KpiStatCardsSkeleton count={3} />
          </div>
        </div>

        {/* Connected Segmented Tabs Row Skeleton */}
        <div className="flex items-center justify-between px-6 py-2.5 border-t border-border dark:border-white/10 bg-white dark:bg-card">
          <Skeleton className="h-8 w-40 rounded-full dark:bg-muted" />
          <Skeleton className="h-8 w-44 rounded-full dark:bg-muted" />
        </div>

        {/* Calculation Progress Skeleton */}
        <div className="p-6 border-t border-border dark:border-border bg-white dark:bg-card">
          <ComplianceCalcSkeleton />
        </div>

        {/* DataViewToolbar Skeleton */}
        <div className="border-t border-border dark:border-border px-5 py-3 bg-white dark:bg-card flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-72 sm:w-80 rounded-xl dark:bg-muted" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Table Skeleton */}
        <ComplianceTableSkeleton rowCount={6} embedded={true} />
      </div>
    </div>
  );
}

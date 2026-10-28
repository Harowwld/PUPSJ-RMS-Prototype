"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton"
import DirectoryTableSkeleton from "@/components/systemadmin/skeletons/DirectoryTableSkeleton"

export default function GlobalStaffSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta select-none">
      {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, Table & Pagination */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* Header */}
        <PageHeader
          icon="ph-bold ph-users"
          title="Global Personnel Directory"
          description="Manage system access, office assignments, and authorization settings for all administrators and records staff."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-36 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        {/* 3 Top KPI Stat Cards */}
        <div className="px-6 pb-6">
          <KpiStatCardsSkeleton count={3} />
        </div>

        {/* Navigation Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Left: Apple Segmented Control Skeleton */}
          <div className="flex items-center gap-1 p-1 bg-gray-100/80 dark:bg-zinc-800/60 rounded-xl border border-border/60 shrink-0">
            <Skeleton className="h-7 w-20 rounded-lg dark:bg-muted" />
            <Skeleton className="h-7 w-24 rounded-lg dark:bg-muted" />
          </div>

          {/* Right: Scroll controls, Search & Filter Skeleton */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <Skeleton className="h-8 w-24 rounded-xl dark:bg-muted" />
              <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
              <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
            </div>
            <Skeleton className="h-9 w-full sm:w-[260px] lg:w-[280px] rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Table Body & Pagination */}
        <div className="overflow-hidden rounded-b-2xl border-t border-border dark:border-border bg-white dark:bg-card flex flex-col flex-[1_0_auto]">
          <DirectoryTableSkeleton rowCount={8} />
        </div>
      </Card>
    </div>
  )
}

"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import TaxonomyTableSkeleton from "@/components/admin/skeletons/TaxonomyTableSkeleton"

export default function SystemConfigSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col gap-4 w-full animate-fade-up font-jakarta select-none">
      <Card className="p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none w-full flex flex-[1_0_auto] flex-col isolate font-jakarta">
        {/* Top Subtab Switcher Bar inside One-Card Container */}
        <div className="flex items-center px-6 py-3.5 border-b border-border dark:border-border bg-gray-50/40 dark:bg-zinc-900/30 rounded-t-2xl">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100/90 dark:bg-zinc-900/80 border border-border/80 dark:border-border w-fit select-none">
            <Skeleton className="h-8 w-32 rounded-xl dark:bg-muted" />
            <Skeleton className="h-8 w-32 rounded-xl dark:bg-muted" />
            <Skeleton className="h-8 w-28 rounded-xl dark:bg-muted" />
            <Skeleton className="h-8 w-20 rounded-xl dark:bg-muted" />
            <Skeleton className="h-8 w-36 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Subtab Toolbar Skeleton */}
        <div className="p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30 border-b border-border dark:border-border">
          <div className="flex items-center gap-6 shrink-0">
            <Skeleton className="h-5 w-20 rounded dark:bg-muted" />
            <Skeleton className="h-5 w-24 rounded dark:bg-muted" />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Skeleton className="h-9 w-full sm:w-64 min-w-[200px] rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <Skeleton className="h-8 w-24 rounded-xl dark:bg-muted" />
              <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
              <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
            </div>
            <Skeleton className="h-10 w-36 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Table Body & Pagination */}
        <div className="w-full flex-[1_0_auto] flex flex-col">
          <TaxonomyTableSkeleton rowCount={8} embedded={true} showSubtext={true} showPagination={true} />
        </div>
      </Card>
    </div>
  )
}

"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import DocumentRequestsTableSkeleton from "@/components/staff/skeletons/DocumentRequestsTableSkeleton"

export default function DocumentRequestsSkeleton() {
  return (
    <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up select-none">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* 1. Page Header */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44 rounded" />
              <Skeleton className="h-3.5 w-64 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </div>

        {/* 2. Connected Segmented Tabs Row */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-white dark:bg-card overflow-x-auto scrollbar-none gap-4">
          <Skeleton className="h-8 w-80 rounded-full" />
          <Skeleton className="h-8 w-44 rounded-full ml-auto" />
        </div>

        {/* 3. Navigation Toolbar */}
        <div className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-card">
          <Skeleton className="h-9 w-72 sm:w-80 rounded-xl" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>

        {/* 4. Table Body Skeleton with embedded Pagination Footer */}
        <div className="w-full flex flex-col flex-[1_0_auto] border-t border-border dark:border-border">
          <DocumentRequestsTableSkeleton rowCount={10} embedded={true} />
        </div>
      </Card>
    </div>
  )
}

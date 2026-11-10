"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import DocumentsMatrixSkeleton from "@/components/staff/skeletons/DocumentsMatrixSkeleton"

export default function DocumentsTabSkeleton() {
  return (
    <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up select-none">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* 1. Header */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44 rounded" />
              <Skeleton className="h-3.5 w-64 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-44 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>

        {/* 2. KPI Metric Cards */}
        <div className="border-t border-border dark:border-border grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white dark:bg-card">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-white dark:bg-card space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-16 rounded" />
              <Skeleton className="h-3 w-36 rounded" />
            </div>
          ))}
        </div>

        {/* 3. Navigation Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-card">
          <div className="flex items-center gap-2.5 flex-1">
            <Skeleton className="h-9 w-full max-w-sm rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-64 rounded-xl" />
          </div>
        </div>

        {/* 4. Table Body */}
        <div className="w-full flex flex-col flex-[1_0_auto] border-t border-border dark:border-border">
          <DocumentsMatrixSkeleton rowCount={10} embedded={true} />
        </div>

        {/* 5. Pagination Footer */}
        <div className="flex items-center justify-between border-t border-border bg-white dark:bg-card p-4 px-6 rounded-b-2xl mt-auto">
          <div className="flex items-center gap-6">
            <Skeleton className="h-3.5 w-32 rounded" />
            <div className="hidden sm:flex items-center gap-2">
              <Skeleton className="h-3.5 w-10 rounded" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-6 w-7 rounded-lg" />
                <Skeleton className="h-6 w-7 rounded-lg" />
                <Skeleton className="h-6 w-7 rounded-lg" />
                <Skeleton className="h-6 w-7 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-14 rounded-xl" />
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-8 w-14 rounded-xl" />
          </div>
        </div>
      </Card>
    </div>
  )
}

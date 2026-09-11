"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function StaffTabSkeleton() {
  return (
    <div className="flex flex-1 flex-col h-full min-h-0 w-full gap-4 animate-fade-up select-none font-inter">
      {/* ONE Single Container Card */}
      <div className="overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card flex flex-col flex-1 min-h-[500px] mb-4 isolate font-inter">
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
            <Skeleton className="h-9 w-24 rounded-lg dark:bg-muted" />
          </div>
        </div>

        {/* Toolbar / Search Row */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-gray-100 dark:border-white/10 bg-gray-50/40 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-64 rounded-lg dark:bg-muted" />
            <Skeleton className="h-9 w-32 rounded-lg dark:bg-muted" />
          </div>
          <Skeleton className="h-9 w-20 rounded-lg dark:bg-muted" />
        </div>

        {/* Content Placeholder Rows */}
        <div className="p-6 space-y-4 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/5 last:border-b-0"
            >
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="h-9 w-9 rounded-full dark:bg-muted shrink-0" />
                <div className="space-y-1.5 flex-1 max-w-sm">
                  <Skeleton className="h-3.5 w-4/5 rounded dark:bg-muted" />
                  <Skeleton className="h-2.5 w-1/2 rounded dark:bg-muted" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-full dark:bg-muted mx-4 hidden sm:block" />
              <Skeleton className="h-4 w-28 rounded dark:bg-muted mx-4 hidden md:block" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
                <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer Pagination Skeleton */}
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/10 p-4 px-6 bg-white dark:bg-card mt-auto rounded-b-2xl">
          <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16 rounded-lg dark:bg-muted" />
            <Skeleton className="h-8 w-16 rounded-lg dark:bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

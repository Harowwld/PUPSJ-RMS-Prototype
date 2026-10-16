"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function StaffTabSkeleton() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col w-full gap-4 animate-fade-up select-none font-jakarta">
      {/* ONE Single Container Card */}
      <div className="min-h-0 min-w-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card flex flex-col flex-1 mb-4 isolate font-jakarta">
        {/* Header Skeleton */}
        <div className="flex min-w-0 items-center justify-between p-3 sm:p-6">
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
        <div className="flex min-w-0 items-center justify-between gap-3 p-3 sm:p-4 sm:px-6 border-t border-border dark:border-border bg-gray-50/40 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-64 rounded-lg dark:bg-muted" />
            <Skeleton className="h-9 w-32 rounded-lg dark:bg-muted" />
          </div>
          <Skeleton className="h-9 w-20 rounded-lg dark:bg-muted" />
        </div>

        {/* Content Placeholder Rows */}
        <div className="min-h-0 min-w-0 overflow-hidden p-3 sm:p-6 space-y-2 sm:space-y-4 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-border dark:border-border last:border-b-0"
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
        <div className="flex items-center justify-between border-t border-border dark:border-border p-4 px-6 bg-white dark:bg-card mt-auto rounded-b-2xl">
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

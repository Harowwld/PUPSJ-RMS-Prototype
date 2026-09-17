"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function StorageExplorerSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 w-full animate-fade-up font-jakarta select-none px-8 pb-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card flex flex-col justify-between min-h-[180px]"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24 rounded dark:bg-muted" />
                  <Skeleton className="h-3 w-32 rounded dark:bg-muted" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
            </div>

            {/* Occupancy bar skeleton */}
            <div className="space-y-2 mt-4">
              <div className="flex justify-between">
                <Skeleton className="h-2.5 w-20 rounded dark:bg-muted" />
                <Skeleton className="h-2.5 w-10 rounded dark:bg-muted" />
              </div>
              <Skeleton className="h-2 w-full rounded-full dark:bg-muted" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5 mt-4">
            <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

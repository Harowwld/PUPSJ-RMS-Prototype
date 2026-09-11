"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function OsasMonitoringSkeleton() {
  return (
    <div className="font-inter w-full flex flex-1 flex-col h-full min-h-0 gap-6 focus:outline-none animate-fade-up select-none">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-inter mb-4 min-h-0 flex-1">
        {/* PageHeader Skeleton */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-3.5 w-64 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-32 rounded-xl" />
            <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </div>

        {/* Toolbar Skeleton */}
        <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          <div className="flex gap-1.5 overflow-x-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-lg shrink-0" />
            ))}
          </div>
          <Skeleton className="h-9 w-full md:w-80 rounded-xl shrink-0" />
        </div>

        {/* Table Rows Skeleton */}
        <div className="border-t border-gray-100 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5 flex-1 bg-white dark:bg-card">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 py-3.5 px-6"
            >
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-56 rounded" />
                <Skeleton className="h-3 w-36 rounded" />
              </div>
              <Skeleton className="h-4 w-32 rounded hidden md:block" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-8 w-18 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Footer Skeleton */}
        <div className="border-t border-gray-100 dark:border-white/10 p-4 px-6 flex items-center justify-between bg-white dark:bg-card mt-auto rounded-b-2xl select-none">
          <div className="flex items-center gap-6">
            <Skeleton className="h-3.5 w-36 rounded" />
            <div className="hidden sm:flex items-center gap-2">
              <Skeleton className="h-3.5 w-10 rounded" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-6 w-8 rounded-lg" />
                <Skeleton className="h-6 w-8 rounded-lg" />
                <Skeleton className="h-6 w-8 rounded-lg" />
                <Skeleton className="h-6 w-8 rounded-lg" />
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

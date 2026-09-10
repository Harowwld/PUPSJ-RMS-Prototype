"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function NotificationsTableSkeleton({ rowCount = 6 }) {
  return (
    <div className="flex-1 flex flex-col space-y-4 animate-fade-up font-inter select-none">
      <div className="flex-1 border border-gray-200 rounded-brand overflow-hidden flex flex-col dark:border-white/10 bg-white dark:bg-card">
        <Skeleton className="h-10 w-full rounded-none dark:bg-muted" />
        <div className="divide-y divide-gray-100 dark:divide-white/10 flex-1">
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                </div>
                <div className="hidden lg:block space-y-2">
                  <Skeleton className="h-4 w-24 dark:bg-muted" />
                </div>
                <div className="hidden lg:block space-y-2">
                  <Skeleton className="h-4 w-32 dark:bg-muted" />
                </div>
                <div className="hidden lg:block space-y-2">
                  <Skeleton className="h-6 w-24 rounded-full dark:bg-muted" />
                </div>
                <div className="hidden lg:block space-y-2">
                  <Skeleton className="h-4 w-40 dark:bg-muted" />
                </div>
                <div className="hidden lg:block space-y-2">
                  <Skeleton className="h-4 w-20 dark:bg-muted" />
                </div>
                <div className="hidden lg:block space-y-2">
                  <Skeleton className="h-4 w-24 dark:bg-muted" />
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Skeleton className="h-9 w-9 rounded-brand dark:bg-muted" />
                <Skeleton className="h-9 w-9 rounded-brand dark:bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

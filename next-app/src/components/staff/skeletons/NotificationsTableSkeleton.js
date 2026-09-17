"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function NotificationsTableSkeleton({ rowCount = 6, embedded = false }) {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col animate-fade-up font-jakarta select-none",
        !embedded && "border border-gray-200 rounded-2xl overflow-hidden dark:border-white/10 bg-white dark:bg-card shadow-sm"
      )}
    >
      <div className="h-10 w-full border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex items-center px-4 gap-4">
        <Skeleton className="h-3 w-16 rounded-md dark:bg-muted" />
        <Skeleton className="h-3 w-20 rounded-md dark:bg-muted" />
        <Skeleton className="h-3 w-24 rounded-md dark:bg-muted" />
        <Skeleton className="h-3 w-24 rounded-md dark:bg-muted" />
        <Skeleton className="h-3 w-32 rounded-md dark:bg-muted" />
        <Skeleton className="h-3 w-20 rounded-md dark:bg-muted" />
        <Skeleton className="h-3 w-20 rounded-md dark:bg-muted" />
      </div>
      <div className="divide-y divide-gray-100 dark:divide-white/10 flex-1">
        {Array.from({ length: rowCount }).map((_, i) => (
          <div key={i} className="px-4 py-3.5 flex items-center justify-between">
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 items-center">
              <div>
                <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
              </div>
              <div className="hidden sm:block">
                <Skeleton className="h-3.5 w-24 rounded-md dark:bg-muted" />
              </div>
              <div className="hidden sm:block">
                <Skeleton className="h-4 w-32 rounded-md dark:bg-muted" />
              </div>
              <div className="hidden lg:block">
                <Skeleton className="h-6 w-24 rounded-full dark:bg-muted" />
              </div>
              <div className="hidden lg:block">
                <Skeleton className="h-3.5 w-36 rounded-md dark:bg-muted" />
              </div>
              <div className="hidden lg:block">
                <Skeleton className="h-3.5 w-24 rounded-md dark:bg-muted" />
              </div>
              <div className="hidden lg:block">
                <Skeleton className="h-3.5 w-20 rounded-md dark:bg-muted" />
              </div>
            </div>
            <div className="flex gap-1.5 ml-4">
              <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
              <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
              <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


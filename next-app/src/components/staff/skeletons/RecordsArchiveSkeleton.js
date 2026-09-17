"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function RecordsArchiveSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up font-jakarta select-none">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card flex flex-col justify-between min-h-[170px]"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl dark:bg-muted" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28 rounded dark:bg-muted" />
                <Skeleton className="h-3 w-36 rounded dark:bg-muted" />
              </div>
            </div>
            <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5 mt-4">
            <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
            <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function RecordsArchiveSkeleton() {
  const content = (
        <div className="border-t border-border dark:border-border p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-white dark:bg-card flex-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-gray-50/50 p-6 dark:border-border dark:bg-zinc-900/40 flex flex-col justify-between min-h-[170px]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-3 w-36 rounded" />
                  </div>
                </div>
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border dark:border-border mt-4">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
  )
  return content
}

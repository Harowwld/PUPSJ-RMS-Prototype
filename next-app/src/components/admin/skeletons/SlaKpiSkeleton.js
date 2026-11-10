"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function SlaKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full select-none">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded-full dark:bg-muted" />
              <Skeleton className="h-4 w-28 rounded dark:bg-muted" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
          </div>
          <Skeleton className="h-7 w-20 rounded mt-2 dark:bg-muted" />
          <Skeleton className="h-3.5 w-48 max-w-full rounded mt-2 dark:bg-muted" />
        </div>
      ))}
    </div>
  )
}

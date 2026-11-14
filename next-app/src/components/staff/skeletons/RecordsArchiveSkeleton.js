"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function RecordsArchiveSkeleton({ leaf = false }) {
  return (
    <div role="status" aria-label="Loading archive" aria-busy="true" className={leaf
      ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      : "grid grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] justify-items-center gap-6 p-1"}>
      {Array.from({ length: 6 }, (_, index) => leaf ? (
        <div key={index} aria-hidden="true" className="relative flex min-h-[200px] flex-col justify-between rounded-[14px] border border-border p-5">
          <Skeleton className="absolute right-4 top-4 size-5 rounded-md" />
          <div className="space-y-2 pr-7">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-52 max-w-full" />
            <Skeleton className="h-3.5 w-36 max-w-full" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
        </div>
      ) : (
        <div key={index} aria-hidden="true" className="relative h-44 w-full max-w-[340px] sm:h-48">
          <Skeleton className="absolute left-4 top-1 h-5 w-20 rounded-t-lg" />
          <Skeleton className="absolute inset-x-0 bottom-0 top-[18px] rounded-2xl" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 rounded-2xl border border-border bg-muted/60 p-4">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-32 max-w-full" />
              <Skeleton className="h-3 w-24 max-w-full" />
            </div>
            <Skeleton className="size-7 shrink-0 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

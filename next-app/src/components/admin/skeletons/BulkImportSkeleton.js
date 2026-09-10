"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function BulkImportSkeleton() {
  return (
    <div className="flex flex-col flex-1 gap-6 w-full min-h-0 px-[28px] pb-[28px] select-none animate-fade-up">
      {/* Header */}
      <div className="mt-[20px] flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
          <Skeleton className="h-3 w-56 rounded dark:bg-muted" />
        </div>
        <Skeleton className="h-6 w-6 rounded-full dark:bg-muted" />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-2">
        <Skeleton className="h-9 w-36 rounded-lg dark:bg-muted" />
        <Skeleton className="h-9 w-36 rounded-lg dark:bg-muted" />
      </div>

      {/* Dropzone Skeleton */}
      <div className="flex flex-col flex-1 items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-[#FAFAFA] dark:bg-zinc-900/40 p-12 text-center min-h-[480px]">
        <div className="flex flex-col items-center gap-4 max-w-sm">
          <Skeleton className="h-16 w-16 rounded-2xl dark:bg-muted" />
          <div className="space-y-2 w-full flex flex-col items-center">
            <Skeleton className="h-4 w-48 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-64 rounded dark:bg-muted" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-6 w-20 rounded-md dark:bg-muted" />
            <Skeleton className="h-6 w-20 rounded-md dark:bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

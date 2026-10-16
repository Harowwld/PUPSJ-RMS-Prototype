"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function BatchReviewSkeleton() {
  return (
    <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] grid-rows-1 border-t border-border dark:border-border animate-fade-up font-jakarta select-none" style={{ gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.4fr)" }}>
      {/* Left: Review Queue Column */}
      <div className="flex min-h-0 min-w-0 flex-col border-r border-border dark:border-border">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 dark:border-border bg-gray-50/20 dark:bg-zinc-900/20">
          <Skeleton className="h-4 w-28 rounded-md dark:bg-muted" />
          <Skeleton className="h-3 w-16 rounded-md dark:bg-muted" />
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden p-2 sm:p-4 space-y-2 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-full rounded-xl border border-border/80 dark:border-border p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-md dark:bg-muted shrink-0" />
                <Skeleton className="h-3.5 w-4/5 rounded-md dark:bg-muted" />
              </div>
              <div className="flex justify-between items-center pt-1">
                <Skeleton className="h-4 w-20 rounded-full dark:bg-muted" />
                <Skeleton className="h-4 w-16 rounded-lg dark:bg-muted" />
              </div>
            </div>
          ))}

          {/* Queue Pagination */}
          <div className="mt-auto flex items-center justify-between border-t border-border pt-3 px-1 dark:border-border">
            <Skeleton className="h-7 w-16 rounded-lg dark:bg-muted" />
            <Skeleton className="h-3 w-20 rounded-md dark:bg-muted" />
            <Skeleton className="h-7 w-16 rounded-lg dark:bg-muted" />
          </div>
        </div>
      </div>

      {/* Right: Inspector Column */}
      <div className="flex min-h-0 min-w-0 flex-col flex-1">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 dark:border-border bg-gray-50/20 dark:bg-zinc-900/20">
          <Skeleton className="h-4 w-48 rounded-md dark:bg-muted" />
          <Skeleton className="h-4 w-20 rounded-full dark:bg-muted" />
        </div>
        <div className="grid min-h-0 min-w-0 grid-rows-1 grid-cols-2 gap-3 p-3 sm:gap-5 sm:p-5 flex-1">
          {/* Left Sub-column: Scanned Document Preview Canvas */}
          <div className="flex min-h-0 items-center justify-center rounded-2xl border border-border bg-gray-50/70 dark:border-border dark:bg-zinc-900/50 p-6 flex-col max-md:h-10 max-md:p-1">
            <Skeleton className="mb-4 h-16 w-16 rounded-2xl dark:bg-muted max-md:hidden" />
            <Skeleton className="mb-2 h-3.5 w-44 rounded-md dark:bg-muted max-md:hidden" />
            <Skeleton className="h-3 w-32 rounded-md dark:bg-muted max-md:hidden" />
          </div>

          {/* Right Sub-column: Student Candidates and OCR Metadata */}
          <div className="grid min-h-0 grid-cols-2 content-start gap-2 sm:gap-4 md:block md:space-y-4">
            {/* Student Assignment Candidates */}
            <div className="col-span-2 space-y-1 md:col-span-1 md:space-y-2">
              <Skeleton className="h-3.5 w-32 rounded-md dark:bg-muted" />
              <div className="rounded-xl border border-border p-3 space-y-1.5 dark:border-border">
                <Skeleton className="h-4 w-36 rounded-md dark:bg-muted" />
                <Skeleton className="h-3 w-24 rounded-md dark:bg-muted" />
              </div>
            </div>

            {/* Document Type & Extracted Name */}
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-3 w-24 rounded-md dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-3 w-24 rounded-md dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
            </div>

            {/* Metrics: Match Confidence & Quality */}
            <div className="col-span-2 grid grid-cols-2 gap-2.5 md:col-span-1">
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-1.5 dark:border-blue-900/30 dark:bg-blue-950/20">
                <Skeleton className="h-2.5 w-20 rounded-md dark:bg-muted" />
                <Skeleton className="h-6 w-14 rounded-md dark:bg-muted" />
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-1.5 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                <Skeleton className="h-2.5 w-20 rounded-md dark:bg-muted" />
                <Skeleton className="h-6 w-14 rounded-md dark:bg-muted" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="col-span-2 flex gap-2 pt-2 border-t border-border dark:border-border md:col-span-1">
              <Skeleton className="h-10 w-24 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-20 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-20 rounded-xl dark:bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

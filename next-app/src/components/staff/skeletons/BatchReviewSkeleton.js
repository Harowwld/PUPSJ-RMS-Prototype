"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function BatchReviewSkeleton() {
  return (
    <div className="grid min-h-[580px] flex-1 border-t border-gray-100 dark:border-white/10 lg:grid-cols-[minmax(280px,0.8fr)_minmax(460px,1.4fr)] animate-fade-up font-inter select-none">
      {/* Left: Review Queue Column */}
      <div className="flex min-h-0 flex-col border-b border-gray-100 dark:border-white/10 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-white/5 bg-gray-50/20 dark:bg-zinc-900/20">
          <Skeleton className="h-4 w-28 rounded-md dark:bg-muted" />
          <Skeleton className="h-3 w-16 rounded-md dark:bg-muted" />
        </div>
        <div className="flex h-full min-h-0 flex-col p-4 space-y-2 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-full rounded-xl border border-gray-200/80 dark:border-white/5 p-3 space-y-2"
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
          <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3 px-1 dark:border-white/5">
            <Skeleton className="h-7 w-16 rounded-lg dark:bg-muted" />
            <Skeleton className="h-3 w-20 rounded-md dark:bg-muted" />
            <Skeleton className="h-7 w-16 rounded-lg dark:bg-muted" />
          </div>
        </div>
      </div>

      {/* Right: Inspector Column */}
      <div className="flex min-h-0 flex-col flex-1">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-white/5 bg-gray-50/20 dark:bg-zinc-900/20">
          <Skeleton className="h-4 w-48 rounded-md dark:bg-muted" />
          <Skeleton className="h-4 w-20 rounded-full dark:bg-muted" />
        </div>
        <div className="grid min-h-0 gap-5 p-5 xl:grid-cols-2 flex-1">
          {/* Left Sub-column: Scanned Document Preview Canvas */}
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50/70 dark:border-white/10 dark:bg-zinc-900/50 p-6 flex-col">
            <Skeleton className="h-16 w-16 rounded-2xl dark:bg-muted mb-4" />
            <Skeleton className="h-3.5 w-44 rounded-md dark:bg-muted mb-2" />
            <Skeleton className="h-3 w-32 rounded-md dark:bg-muted" />
          </div>

          {/* Right Sub-column: Student Candidates and OCR Metadata */}
          <div className="space-y-4">
            {/* Student Assignment Candidates */}
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-32 rounded-md dark:bg-muted" />
              <div className="rounded-xl border border-gray-200 p-3 space-y-1.5 dark:border-white/10">
                <Skeleton className="h-4 w-36 rounded-md dark:bg-muted" />
                <Skeleton className="h-3 w-24 rounded-md dark:bg-muted" />
              </div>
            </div>

            {/* Document Type & Extracted Name */}
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded-md dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded-md dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
            </div>

            {/* Metrics: Match Confidence & Quality */}
            <div className="grid grid-cols-2 gap-2.5">
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
            <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
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

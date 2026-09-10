"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardHeader, CardContent } from "@/components/ui/card"

export default function BatchReviewSkeleton() {
  return (
    <div className="grid min-h-[520px] flex-1 gap-4 lg:grid-cols-[minmax(260px,0.8fr)_minmax(420px,1.4fr)] animate-fade-up font-inter select-none">
      {/* Left: Review Queue List */}
      <Card className="min-h-0 overflow-hidden rounded-brand border border-gray-200 bg-white dark:border-white/10 dark:bg-card flex flex-col">
        <CardHeader className="border-b border-gray-100 px-4 py-3 dark:border-white/5">
          <Skeleton className="h-4 w-28 rounded dark:bg-muted" />
        </CardHeader>
        <CardContent className="flex h-full min-h-0 flex-col p-2 space-y-2 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-full rounded-lg border border-gray-100 dark:border-white/5 p-3 space-y-2"
            >
              <Skeleton className="h-3.5 w-4/5 rounded dark:bg-muted" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                <Skeleton className="h-3 w-12 rounded dark:bg-muted" />
              </div>
            </div>
          ))}

          {/* Queue Pagination */}
          <div className="mt-auto flex items-center justify-between border-t border-gray-100 px-2 pt-3 dark:border-white/5">
            <Skeleton className="h-7 w-16 rounded-md dark:bg-muted" />
            <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
            <Skeleton className="h-7 w-16 rounded-md dark:bg-muted" />
          </div>
        </CardContent>
      </Card>

      {/* Right: Inspector with Preview and Verification Form */}
      <Card className="min-h-0 overflow-hidden rounded-brand border border-gray-200 bg-white dark:border-white/10 dark:bg-card flex flex-col">
        <CardHeader className="border-b border-gray-100 px-4 py-3 dark:border-white/5">
          <Skeleton className="h-4 w-48 rounded dark:bg-muted" />
        </CardHeader>
        <CardContent className="grid min-h-0 gap-4 p-4 xl:grid-cols-2 flex-1">
          {/* Left Sub-column: Scanned Document Preview Canvas */}
          <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-gray-200 bg-gray-100 dark:border-zinc-800 dark:bg-zinc-900/60 p-6 flex-col">
            <Skeleton className="h-16 w-16 rounded-2xl dark:bg-muted mb-4" />
            <Skeleton className="h-3.5 w-44 rounded dark:bg-muted mb-2" />
            <Skeleton className="h-3 w-32 rounded dark:bg-muted" />
          </div>

          {/* Right Sub-column: Student Candidates and OCR Metadata */}
          <div className="space-y-4">
            {/* Student Assignment Candidates */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-32 rounded dark:bg-muted" />
              <div className="rounded-lg border border-gray-200 p-3 space-y-1.5 dark:border-white/10">
                <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
                <Skeleton className="h-3 w-24 font-mono rounded dark:bg-muted" />
              </div>
            </div>

            {/* Document Type & Extracted Name */}
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
              <Skeleton className="h-9 w-full rounded-md dark:bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
              <Skeleton className="h-9 w-full rounded-md dark:bg-muted" />
            </div>

            {/* Metrics: Match Confidence & Quality */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-blue-100 bg-blue-50/50 p-2.5 space-y-1.5 dark:border-blue-400/20 dark:bg-blue-950/20">
                <Skeleton className="h-2.5 w-20 rounded dark:bg-muted" />
                <Skeleton className="h-6 w-14 rounded dark:bg-muted" />
              </div>
              <div className="rounded-md border border-emerald-100 bg-emerald-50/50 p-2.5 space-y-1.5 dark:border-emerald-400/20 dark:bg-emerald-950/20">
                <Skeleton className="h-2.5 w-20 rounded dark:bg-muted" />
                <Skeleton className="h-6 w-14 rounded dark:bg-muted" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 w-20 rounded-md dark:bg-muted" />
              <Skeleton className="h-9 w-24 rounded-md dark:bg-muted" />
              <Skeleton className="h-9 w-18 rounded-md dark:bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function RecognitionTemplateSkeleton() {
  return (
    <div className="space-y-5 p-7 select-none animate-fade-up">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-48 rounded dark:bg-muted" />
        <Skeleton className="h-3.5 w-96 max-w-full rounded dark:bg-muted" />
      </div>

      {/* 3-Column Grid */}
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        {/* Left Panel */}
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
            <Skeleton className="h-9 w-full rounded-md dark:bg-muted" />
          </div>

          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
            <Skeleton className="h-9 w-full rounded-md dark:bg-muted" />
            <Skeleton className="h-2.5 w-48 rounded dark:bg-muted mt-1" />
          </div>

          <div className="pt-2 space-y-2">
            <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((f) => (
                <Skeleton key={f} className="h-9 w-full rounded-md dark:bg-muted" />
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel (Document View / Canvas) */}
        <div className="min-h-[520px] rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card flex flex-col justify-between">
          <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24 rounded-lg dark:bg-muted" />
              <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
            </div>
            <Skeleton className="h-8 w-28 rounded-lg dark:bg-muted" />
          </div>

          <div className="my-auto flex flex-col items-center justify-center p-12 text-center">
            <Skeleton className="h-20 w-20 rounded-2xl dark:bg-muted mb-4" />
            <Skeleton className="h-4 w-52 rounded dark:bg-muted mb-2" />
            <Skeleton className="h-3 w-72 rounded dark:bg-muted" />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex justify-end gap-2">
            <Skeleton className="h-9 w-28 rounded-lg dark:bg-muted" />
          </div>
        </div>

        {/* Right Panel (Saved Templates List) */}
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
          <Skeleton className="h-4 w-32 rounded dark:bg-muted mb-3" />
          <div className="space-y-2.5">
            {[1, 2, 3].map((t) => (
              <div
                key={t}
                className="p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-card space-y-2"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                  <Skeleton className="h-4 w-10 rounded-full dark:bg-muted" />
                </div>
                <Skeleton className="h-2.5 w-36 rounded dark:bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

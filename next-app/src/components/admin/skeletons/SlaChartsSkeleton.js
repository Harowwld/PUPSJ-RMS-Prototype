"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function SlaChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch select-none">
      {/* Left Column (2 Cols): Horizontal graphs (Request Trends & Document Demand) */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Card 1: Request Trends Chart Skeleton */}
        <div className="flex-1 rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-card dark:shadow-none flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 rounded dark:bg-muted" />
              <Skeleton className="h-7 w-24 rounded dark:bg-muted" />
            </div>
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-border/60 dark:border-border">
              <Skeleton className="h-6 w-14 rounded-lg dark:bg-muted" />
              <Skeleton className="h-6 w-14 rounded-lg dark:bg-muted" />
              <Skeleton className="h-6 w-14 rounded-lg dark:bg-muted" />
            </div>
          </div>
          <div className="flex-1 min-h-[270px] h-[270px] flex flex-col justify-end gap-2 pt-6">
            <div className="h-[180px] w-full flex items-end justify-between gap-3 px-2 border-b border-border dark:border-border">
              {[35, 65, 45, 80, 60, 90, 70, 50, 75, 40, 85, 60].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                  <Skeleton className="w-full rounded-t-sm dark:bg-muted" style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center px-1 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-10 rounded dark:bg-muted" />
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Document Demand Chart Skeleton (Horizontal Bars) */}
        <div className="flex-1 rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-card dark:shadow-none flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36 rounded dark:bg-muted" />
              <Skeleton className="h-7 w-24 rounded dark:bg-muted" />
            </div>
            <Skeleton className="h-4 w-32 rounded dark:bg-muted mt-2" />
          </div>
          <div className="flex-1 min-h-[270px] h-[270px] flex flex-col justify-center gap-4 py-2">
            {[80, 62, 45, 34, 22].map((w, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-3.5 w-40 rounded dark:bg-muted shrink-0" />
                <div className="flex-1 flex items-center gap-3">
                  <Skeleton className="h-5 rounded-r-md dark:bg-muted" style={{ width: `${w}%` }} />
                  <Skeleton className="h-3 w-6 rounded dark:bg-muted shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column (1 Col): Vertical Align (Status Distribution & Ranked Summary) */}
      <div className="lg:col-span-1 flex flex-col">
        <div className="flex-1 flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-card dark:shadow-none h-full justify-between">
          {/* Status Distribution Skeleton */}
          <div className="flex flex-col flex-1">
            <Skeleton className="h-5 w-36 rounded dark:bg-muted mb-4" />
            <div className="h-44 w-full flex items-center justify-center">
              <div className="relative h-32 w-32 rounded-full border-[14px] border-border dark:border-border flex items-center justify-center">
                <div className="text-center space-y-1">
                  <Skeleton className="h-6 w-10 mx-auto rounded dark:bg-muted" />
                  <Skeleton className="h-2.5 w-12 mx-auto rounded dark:bg-muted" />
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col pt-3 border-t border-border dark:border-border space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between h-[36px] px-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2.5 w-2.5 rounded-full dark:bg-muted" />
                    <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-6 rounded dark:bg-muted" />
                    <Skeleton className="h-3.5 w-8 rounded dark:bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-white/5 my-6" />

          {/* Top Requested Documents Skeleton */}
          <div className="flex flex-col flex-1 justify-between">
            <Skeleton className="h-5 w-44 rounded dark:bg-muted mb-4" />
            <div className="space-y-2 flex-1 flex flex-col justify-center">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between h-[40px] px-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-4 rounded dark:bg-muted" />
                    <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
                  </div>
                  <Skeleton className="h-3.5 w-16 rounded dark:bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

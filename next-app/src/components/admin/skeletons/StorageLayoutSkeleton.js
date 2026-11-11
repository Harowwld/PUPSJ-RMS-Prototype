"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function StorageLayoutSkeleton() {
  return (
    <div className="relative flex flex-1 flex-col lg:flex-none lg:h-[min(80vh,900px)] lg:flex-row min-h-[620px] w-full" aria-busy="true" aria-label="Loading storage layout">
      {/* Left: 2D Blueprint Canvas Pane */}
      <div className="flex-1 min-w-0 p-8 flex items-center justify-center bg-[#f8fafc] dark:bg-zinc-950/20">
        <div className="relative h-[480px] w-full max-w-[680px] rounded-2xl border-2 border-dashed border-border dark:border-border bg-white/60 dark:bg-card/40 p-6 flex flex-col justify-between">
          {/* Top Room Tag */}
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-28 rounded-lg dark:bg-muted" />
            <Skeleton className="h-4 w-16 rounded dark:bg-muted" />
          </div>

          {/* Simulated Cabinet Boxes on Blueprint */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 p-2 sm:p-4 my-auto">
            {[1, 2, 3, 4, 5, 6].map((cab) => (
              <div
                key={cab}
                className="h-24 rounded-xl border border-border dark:border-border bg-gray-50 dark:bg-muted/30 p-3 flex flex-col justify-between shadow-xs"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-8 rounded dark:bg-muted" />
                  <Skeleton className="h-3 w-12 rounded dark:bg-muted" />
                </div>
                <div className="space-y-1">
                  <div className="h-1 w-full rounded-full bg-gray-200 dark:bg-white/10" />
                  <div className="h-1 w-full rounded-full bg-gray-200 dark:bg-white/10" />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Door / Entrance Indicator */}
          <div className="flex items-center gap-2 pt-2 border-t border-dashed border-border dark:border-border">
            <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
          </div>
        </div>
      </div>

      {/* Right: Integrated Inspector Pane (Seamless, No Card) */}
      <div className="w-full h-[min(60vh,480px)] lg:h-full lg:w-[380px] min-h-0 overflow-hidden shrink-0 border-t lg:border-t-0 lg:border-l border-border dark:border-border bg-white dark:bg-card p-5 flex flex-col justify-between space-y-6">
        <div className="space-y-5">
          <div>
            <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-48 rounded dark:bg-muted mt-1.5" />
          </div>

          {/* Segmented Control Skeleton */}
          <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />
            </div>

            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
              <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
              <div className="space-y-1.5 pt-1">
                {[1, 2, 3, 4].map((d) => (
                  <Skeleton key={d} className="h-8 w-full rounded-xl dark:bg-muted" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

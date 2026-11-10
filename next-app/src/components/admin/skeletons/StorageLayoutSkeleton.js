"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function StorageLayoutSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card flex flex-col flex-[1_0_auto] min-h-[700px] select-none animate-fade-up">
      {/* 1. PageHeader Area */}
      <div className="flex items-center justify-between p-6 border-b border-border dark:border-border">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-44 rounded dark:bg-muted" />
              <Skeleton className="h-3 w-48 rounded dark:bg-muted" />
            </div>
            <Skeleton className="h-3 w-72 rounded dark:bg-muted" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
          <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
        </div>
      </div>

      {/* 2. Room Switcher Row */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-border dark:border-border bg-white dark:bg-card">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08]">
            <Skeleton className="h-7 w-24 rounded-lg dark:bg-muted" />
            <Skeleton className="h-7 w-24 rounded-lg dark:bg-muted" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg dark:bg-muted" />
        </div>
        <Skeleton className="h-4 w-52 rounded dark:bg-muted" />
      </div>

      {/* 3. Canvas Toolbar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-border dark:border-border bg-white dark:bg-card">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-20 rounded-xl dark:bg-muted" />
          <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-16 rounded-xl dark:bg-muted" />
          <Skeleton className="h-9 w-16 rounded-xl dark:bg-muted" />
          <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
        </div>
      </div>

      {/* 4. Main 2-Pane Split: Canvas & Inspector */}
      <div className="flex flex-1 flex-col lg:flex-row min-h-[580px]">
        {/* Left: 2D Blueprint Canvas Pane */}
        <div className="flex-1 min-w-0 p-8 flex items-center justify-center bg-[#f8fafc] dark:bg-zinc-950/20">
          <div className="relative h-[480px] w-full max-w-[680px] rounded-2xl border-2 border-dashed border-border dark:border-border bg-white/60 dark:bg-card/40 p-6 flex flex-col justify-between">
            {/* Top Room Tag */}
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-28 rounded-lg dark:bg-muted" />
              <Skeleton className="h-4 w-16 rounded dark:bg-muted" />
            </div>

            {/* Simulated Cabinet Boxes on Blueprint */}
            <div className="grid grid-cols-3 gap-6 p-4 my-auto">
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
        <div className="w-full lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-border dark:border-border bg-white dark:bg-card p-5 flex flex-col justify-between space-y-6">
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
    </div>
  )
}

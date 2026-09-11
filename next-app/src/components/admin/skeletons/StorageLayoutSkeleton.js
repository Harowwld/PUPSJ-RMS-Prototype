"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function StorageLayoutSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card flex flex-col flex-1 min-h-[700px] select-none animate-fade-up">
      {/* Header Area */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-48 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-72 rounded dark:bg-muted" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
        </div>
      </div>

      {/* Editor Toolbar (h-[56px]) */}
      <div className="flex h-[56px] items-center justify-between px-6 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-muted/10">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-14 rounded-lg dark:bg-muted" />
          <Skeleton className="h-9 w-14 rounded-lg dark:bg-muted" />
          <div className="w-2" />
          <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
          <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
          <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
          <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
          <Skeleton className="h-9 w-20 rounded-xl dark:bg-muted" />
        </div>
      </div>

      {/* Main Split Canvas Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 min-h-[550px]">
        {/* Left: 2D Floorplan Blueprint Canvas (col-span-2) */}
        <div className="lg:col-span-2 p-8 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-white/10 bg-gray-50/30 dark:bg-zinc-950/30 flex items-center justify-center">
          <div className="relative h-[480px] w-full max-w-[650px] rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 bg-white/60 dark:bg-card/40 p-6 flex flex-col justify-between">
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
                  className="h-24 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-muted/30 p-3 flex flex-col justify-between shadow-xs"
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
            <div className="flex items-center gap-2 pt-2 border-t border-dashed border-gray-200 dark:border-white/10">
              <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
            </div>
          </div>
        </div>

        {/* Right: Inspector Sidebar (col-span-1) */}
        <div className="lg:col-span-1 p-6 flex flex-col justify-between bg-white dark:bg-card space-y-6">
          <div className="space-y-5">
            <div>
              <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
              <Skeleton className="h-3 w-48 rounded dark:bg-muted mt-1.5" />
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                <Skeleton className="h-9 w-full rounded-lg dark:bg-muted" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                  <Skeleton className="h-9 w-full rounded-lg dark:bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                  <Skeleton className="h-9 w-full rounded-lg dark:bg-muted" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
                <div className="space-y-2 pt-1">
                  {[1, 2, 3, 4].map((d) => (
                    <Skeleton key={d} className="h-8 w-full rounded-md dark:bg-muted" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-white/10">
            <Skeleton className="h-9 w-full rounded-lg dark:bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

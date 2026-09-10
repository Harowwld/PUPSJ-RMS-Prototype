"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function SlaChartsSkeleton() {
  return (
    <div className="space-y-6 w-full select-none">
      {/* 1. Main Volume Bar / Trend Chart Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-44 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-64 rounded dark:bg-muted" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg dark:bg-muted" />
            <Skeleton className="h-8 w-24 rounded-lg dark:bg-muted" />
          </div>
        </div>

        {/* Simulated Bar Chart Canvas */}
        <div className="h-[280px] w-full flex items-end justify-between gap-3 pt-6 pb-2 px-4 border-b border-gray-100 dark:border-white/10">
          {[45, 75, 30, 90, 60, 80, 50, 95, 40, 70, 85, 65].map((heightPct, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <Skeleton
                className="w-full max-w-[40px] rounded-t-lg dark:bg-muted transition-all"
                style={{ height: `${heightPct}%` }}
              />
            </div>
          ))}
        </div>

        {/* X-Axis Labels */}
        <div className="flex justify-between items-center pt-3 px-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-12 rounded dark:bg-muted" />
          ))}
        </div>
      </div>

      {/* 2. Dual Breakdown Grid (Donut Breakdown + SLA Metrics) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Donut Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card flex flex-col">
          <div className="mb-4">
            <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-48 rounded dark:bg-muted mt-1" />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 flex-1 py-4">
            {/* Donut Circle */}
            <div className="relative h-40 w-40 rounded-full border-8 border-gray-100 dark:border-white/10 flex items-center justify-center">
              <div className="text-center space-y-1">
                <Skeleton className="h-6 w-12 mx-auto rounded dark:bg-muted" />
                <Skeleton className="h-2.5 w-16 mx-auto rounded dark:bg-muted" />
              </div>
            </div>
            {/* Legend Skeletons */}
            <div className="space-y-3 w-full sm:w-48">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3 rounded-full dark:bg-muted" />
                    <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                  </div>
                  <Skeleton className="h-3 w-8 rounded dark:bg-muted font-mono" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Turnaround / SLA Breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card flex flex-col justify-between">
          <div className="mb-4">
            <Skeleton className="h-4 w-40 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-52 rounded dark:bg-muted mt-1" />
          </div>
          <div className="space-y-4 py-2 flex-1">
            {[1, 2, 3, 4].map((tier) => (
              <div key={tier} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                  <Skeleton className="h-3.5 w-12 rounded dark:bg-muted font-mono" />
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                  <Skeleton
                    className="h-full rounded-full dark:bg-muted"
                    style={{ width: `${100 - tier * 18}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex justify-between items-center">
            <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
            <Skeleton className="h-4 w-16 rounded dark:bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function StudentComplianceSkeleton() {
  return (
    <div className="flex flex-col w-full flex-[1_0_auto] animate-in fade-in duration-200 select-none font-jakarta">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate">
        {/* 1. Header Skeleton (matches PageHeader with Refresh + Download PDF + Preview PDF) */}
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <Skeleton className="h-5 w-52 sm:w-64 rounded-md dark:bg-muted" />
              <Skeleton className="h-3.5 w-40 rounded dark:bg-muted" />
            </div>
            <Skeleton className="mt-[4px] h-3.5 w-72 sm:w-96 max-w-full rounded dark:bg-muted" />
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted shrink-0" />
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted shrink-0" />
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted shrink-0" />
          </div>
        </div>

        {/* 2. Stat Cards Skeleton (matches StudentComplianceKpiCards 3-card layout) */}
        <div className="px-6 pb-6">
          <div className="p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col justify-between rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.05] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Skeleton className="size-5 rounded-full dark:bg-muted shrink-0" />
                      <Skeleton className="h-4 w-28 rounded dark:bg-muted" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full dark:bg-muted shrink-0" />
                  </div>
                  <div>
                    <Skeleton className="h-7 w-24 rounded-md dark:bg-muted mb-2" />
                    <Skeleton className="h-3.5 w-44 rounded dark:bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Canonical 2-Zone DataViewToolbar Skeleton */}
        <div className="border-t border-border dark:border-border px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-card">
          <Skeleton className="h-9 w-72 sm:w-80 shrink-0 rounded-xl dark:bg-muted" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
            <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] shrink-0">
              <Skeleton className="size-7 rounded-full bg-transparent dark:bg-transparent" />
              <Skeleton className="size-7 rounded-full bg-white dark:bg-zinc-800 shadow-xs" />
            </div>
          </div>
        </div>

        {/* 4. Default List View Items Skeleton */}
        <div className="flex flex-[1_0_auto] flex-col p-6 pt-3">
          <div
            role="list"
            className="w-full divide-y divide-gray-100 dark:divide-zinc-800/60 border-t border-b border-gray-100 dark:border-zinc-800/60"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                role="listitem"
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 px-4 py-2.5 min-h-[52px]"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <Skeleton className="w-8 h-8 rounded-lg dark:bg-muted shrink-0" />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0 flex-1">
                    <Skeleton className="h-4 w-48 sm:w-56 rounded dark:bg-muted shrink-0" />
                    <div className="hidden lg:flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-gray-300 dark:text-zinc-700 shrink-0">—</span>
                      <Skeleton className="h-3.5 w-64 rounded dark:bg-muted" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-11 sm:pl-0">
                  <div className="flex items-center gap-2">
                    <Skeleton className="hidden md:inline-block h-5 w-24 rounded-full dark:bg-muted" />
                    <Skeleton className="h-5 w-24 rounded-full dark:bg-muted" />
                    <Skeleton className="h-3.5 w-20 rounded dark:bg-muted tabular-nums" />
                  </div>
                  <div className="flex items-center pl-1 border-l border-gray-100 dark:border-zinc-800">
                    <Skeleton className="size-7 rounded-lg dark:bg-muted shrink-0" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

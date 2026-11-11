"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StudentRequestsTableRowsSkeleton({ rowCount = 6 }) {
  return (
    <div role="list" className="w-full divide-y divide-gray-100 dark:divide-zinc-800/60 select-none font-jakarta">
      {Array.from({ length: rowCount }).map((_, i) => (
        <div
          key={i}
          role="listitem"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 px-5 py-3 min-h-[52px]"
        >
          {/* Left: Ticket ID, Doc Type, and inline Purpose/Notes preview */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 min-w-0 shrink-0">
              <Skeleton className="h-4 w-12 rounded dark:bg-muted shrink-0 tabular-nums" />
              <Skeleton
                className={cn(
                  "h-4 rounded dark:bg-muted",
                  i % 3 === 0 ? "w-48" : i % 2 === 0 ? "w-36" : "w-44"
                )}
              />
            </div>
            <div className="hidden md:flex items-center gap-2 min-w-0 flex-1">
              <span className="text-gray-300 dark:text-zinc-700 shrink-0">—</span>
              <Skeleton
                className={cn(
                  "h-3.5 rounded dark:bg-muted",
                  i % 4 === 0 ? "w-56" : i % 3 === 0 ? "w-44" : i % 2 === 0 ? "w-64" : "w-40"
                )}
              />
            </div>
          </div>

          {/* Right: Status badge, Relative Date, and Action Icons */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
              <Skeleton className="h-3.5 w-20 rounded dark:bg-muted tabular-nums" />
            </div>
            <div className="flex items-center gap-1 pl-1 border-l border-gray-100 dark:border-zinc-800">
              {i % 2 === 0 && (
                <Skeleton className="size-7 rounded-lg dark:bg-muted shrink-0" />
              )}
              <Skeleton className="size-7 rounded-lg dark:bg-muted shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StudentRequestsPaginationSkeleton() {
  return (
    <div className="flex items-center justify-between border-t border-border dark:border-border bg-white dark:bg-card p-4 px-6 rounded-b-2xl mt-auto select-none font-jakarta">
      <div className="flex items-center gap-6 text-xs text-gray-900 dark:text-zinc-300">
        <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-10 rounded dark:bg-muted" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-6 w-7 rounded-lg dark:bg-muted" />
            <Skeleton className="h-6 w-7 rounded-lg dark:bg-muted" />
            <Skeleton className="h-6 w-7 rounded-lg dark:bg-muted" />
            <Skeleton className="h-6 w-7 rounded-lg dark:bg-muted" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-14 rounded-xl dark:bg-muted" />
        <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
        <Skeleton className="h-8 w-14 rounded-xl dark:bg-muted" />
      </div>
    </div>
  );
}

export default function StudentRequestsTableSkeleton({ rowCount = 6, showForm = true }) {
  return (
    <div className="flex flex-col w-full flex-[1_0_auto] animate-in fade-in duration-200 select-none font-jakarta">
      {/* ONE Single Card Container encapsulating Header, Inline Request Form, Toolbar, List & Pagination */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate">
        {/* 1. Page Header Skeleton (matches PageHeader without left icon box) */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <Skeleton className="h-5 w-44 rounded-md dark:bg-muted" />
              <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
            </div>
            <Skeleton className="mt-[4px] h-3.5 w-72 sm:w-96 max-w-full rounded dark:bg-muted" />
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted shrink-0" />
            {!showForm && <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted shrink-0" />}
          </div>
        </div>

        {/* 2. Inline Non-Modal Request Form Skeleton */}
        {showForm && (
          <div className="border-t border-border dark:border-border flex flex-col">
            {/* Duplicate-ticket reminder strip */}
            <div className="px-5 sm:px-6 py-3 bg-amber-50/70 dark:bg-amber-500/5 border-b border-amber-200/50 dark:border-amber-500/10 flex items-center gap-2.5">
              <Skeleton className="size-4 rounded-full dark:bg-muted shrink-0" />
              <Skeleton className="h-3.5 w-full max-w-2xl rounded dark:bg-muted" />
            </div>

            <div className="p-5 sm:p-6 bg-gray-50/40 dark:bg-zinc-900/20">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                  <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                  <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
                  <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                  <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
                  <Skeleton className="h-3 w-12 rounded dark:bg-muted" />
                </div>
                <Skeleton className="h-20 w-full rounded-xl dark:bg-muted" />
              </div>

              {/* Supporting Document Upload Dropzone Skeleton */}
              <div className="mt-4 space-y-1.5">
                <Skeleton className="h-3.5 w-48 rounded dark:bg-muted" />
                <div className="rounded-xl border border-dashed border-border dark:border-border bg-white/60 dark:bg-zinc-900/40 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Skeleton className="size-9 rounded-xl dark:bg-muted shrink-0" />
                    <div className="space-y-1 min-w-0">
                      <Skeleton className="h-3.5 w-48 sm:w-64 rounded dark:bg-muted" />
                      <Skeleton className="h-3 w-36 rounded dark:bg-muted" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24 rounded-xl dark:bg-muted shrink-0" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                <Skeleton className="h-3.5 w-64 sm:w-80 rounded dark:bg-muted" />
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Skeleton className="h-9 w-16 rounded-xl dark:bg-muted" />
                  <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Canonical 2-Zone DataViewToolbar Skeleton */}
        <div className="border-t border-border dark:border-border px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-card">
          <Skeleton className="h-9 w-72 sm:w-80 shrink-0 rounded-xl dark:bg-muted" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* 4. Sleek Horizontal Request List Skeleton */}
        <div className="w-full flex-1 border-t border-border dark:border-border divide-y divide-border dark:divide-border bg-white dark:bg-card">
          <StudentRequestsTableRowsSkeleton rowCount={rowCount} />
        </div>

        {/* 5. Pagination Bar Skeleton */}
        <StudentRequestsPaginationSkeleton />
      </Card>
    </div>
  );
}

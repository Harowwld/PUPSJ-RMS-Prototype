"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { getListDensityClasses } from "@/lib/tablePresentation";
import { cn } from "@/lib/utils";

export function StudentRequestsTableRowsSkeleton({ rowCount = 6, density }) {
  const { paddingX, paddingY, gap, minHeight } = getListDensityClasses(density);
  return (
    <div role="list" aria-label="Loading document requests" aria-busy="true" className="w-full divide-y divide-gray-100 dark:divide-zinc-800/60">
      {Array.from({ length: rowCount }, (_, index) => (
        <div key={index} aria-hidden="true" className={cn("flex items-center justify-between", paddingX, paddingY, gap, minHeight)}>
          <div className="mr-2 flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <Skeleton className="h-4 w-[70px] shrink-0" />
            <Skeleton className="h-4 w-40 min-w-0" />
            <Skeleton className="hidden h-3.5 w-44 min-w-0 md:block" />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Skeleton className="h-6 w-16 rounded-full sm:w-20" />
            <Skeleton className="ml-1 hidden h-3.5 w-16 sm:block" />
            <div className="flex items-center gap-1">
              <Skeleton className="size-7 rounded-lg" />
              <Skeleton className="size-7 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StudentRequestsPaginationSkeleton() {
  return (
    <div className="mt-auto flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border bg-white px-6 py-4 dark:bg-card select-none font-jakarta">
      <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3 text-xs text-gray-900 dark:text-zinc-300">
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
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <Skeleton className="h-5 w-44 rounded-md dark:bg-muted" />
              <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
            </div>
            <Skeleton className="mt-[4px] h-3.5 w-72 sm:w-96 max-w-full rounded dark:bg-muted" />
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Skeleton className="size-10 rounded-xl dark:bg-muted shrink-0" />
            {!showForm && <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted shrink-0" />}
          </div>
        </div>

        {/* 2. Inline Non-Modal Request Form Skeleton */}
        {showForm && (
          <div className="flex flex-col">
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
        <div className={cn("px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-card", showForm && "border-t border-border")}>
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

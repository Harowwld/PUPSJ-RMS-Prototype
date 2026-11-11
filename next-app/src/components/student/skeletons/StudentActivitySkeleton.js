"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StudentActivityListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-6 select-none font-jakarta animate-fade-up">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
          <Skeleton className="h-3 w-14 rounded dark:bg-muted" />
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800/80 shadow-2xs">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-4 px-5 py-4"
            >
              <Skeleton className="mt-0.5 h-10 w-10 rounded-full dark:bg-muted shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton
                    className={cn(
                      "h-4 rounded dark:bg-muted",
                      i % 3 === 0 ? "w-52" : i % 2 === 0 ? "w-40" : "w-44"
                    )}
                  />
                  <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
                </div>
                <Skeleton
                  className={cn(
                    "h-3.5 rounded dark:bg-muted",
                    i % 2 === 0 ? "w-3/4" : "w-2/3"
                  )}
                />
                <div className="flex items-center gap-3 pt-1">
                  <Skeleton className="h-3 w-36 rounded dark:bg-muted tabular-nums" />
                  <Skeleton className="h-3 w-24 rounded dark:bg-muted tabular-nums" />
                </div>
              </div>
              <div className="shrink-0 self-center pl-2">
                <Skeleton className="size-7 rounded-lg dark:bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StudentActivitySkeleton({ count = 5 }) {
  return (
    <div className="flex flex-col w-full flex-[1_0_auto] select-none font-jakarta animate-fade-up">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate">
        {/* 1. PageHeader Skeleton (matches MyActivityPanel PageHeader) */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <Skeleton className="h-5 w-36 rounded-md dark:bg-muted" />
              <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
            </div>
            <Skeleton className="mt-[4px] h-3.5 w-72 sm:w-96 max-w-full rounded dark:bg-muted" />
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted shrink-0" />
          </div>
        </div>

        {/* 2. Canonical 2-Zone DataViewToolbar Skeleton */}
        <div className="border-t border-border dark:border-border px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-card">
          <Skeleton className="h-9 w-72 sm:w-80 shrink-0 rounded-xl dark:bg-muted" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* 3. Grouped Activity Feed Skeleton */}
        <div className="border-t border-border dark:border-border flex-1 p-6">
          <StudentActivityListSkeleton count={count} />
        </div>

        {/* 4. TablePagination Footer Skeleton */}
        <div className="flex items-center justify-between border-t border-border dark:border-border bg-white dark:bg-card p-4 px-6 rounded-b-2xl mt-auto">
          <div className="flex items-center gap-6">
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
      </Card>
    </div>
  );
}

"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function StudentComplianceSkeleton() {
  return (
    <div className="flex flex-col w-full flex-1 min-h-0 space-y-4 animate-in fade-in duration-200">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none">
        {/* Header Skeleton */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-56 rounded-md" />
              <Skeleton className="h-3.5 w-80 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </div>

        {/* Stat Cards Skeleton (Standard 3-Card Reorderable Grid) */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-[18px] border border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/60 p-4 min-h-[110px] flex flex-col justify-between select-none"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                    <Skeleton className="h-4 w-16 rounded-full dark:bg-muted" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-[10px] dark:bg-muted" />
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex items-baseline gap-2">
                    <Skeleton className="h-7 w-20 rounded dark:bg-muted" />
                    <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                  </div>
                  <Skeleton className="h-4 w-3 rounded dark:bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar & Header Skeleton */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          <div className="flex items-center gap-3 shrink-0">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44 rounded-md" />
              <Skeleton className="h-3.5 w-64 rounded-md" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:justify-end">
            <Skeleton className="h-9 w-60 rounded-xl" />
            <Skeleton className="h-9 w-40 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
            <Skeleton className="h-9 w-16 rounded-xl" />
          </div>
        </div>

        {/* Items Skeleton List */}
        <div className="p-6 pt-2 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-border/70 dark:border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-48 rounded" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-72 rounded" />
                </div>
              </div>
              <div className="flex items-center self-end sm:self-auto">
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

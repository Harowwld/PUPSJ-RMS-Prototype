"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function StudentComplianceSkeleton() {
  return (
    <div className="flex flex-col w-full flex-1 min-h-0 space-y-4 animate-in fade-in duration-200">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        {/* Header Skeleton */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/10">
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

        {/* Stat Cards Skeleton (Standard 3-Card Grid) */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 p-4 space-y-2 select-none"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-4 w-14 rounded-full" />
                </div>
                <div className="flex items-baseline gap-2">
                  <Skeleton className="h-7 w-16 rounded" />
                  <Skeleton className="h-3.5 w-28 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar & Header Skeleton */}
        <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
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
              className="p-4 rounded-xl border border-gray-200/70 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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

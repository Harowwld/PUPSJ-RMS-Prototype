"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function StudentOverviewSkeleton() {
  return (
    <div className="flex flex-col w-full flex-1 min-h-0 select-none font-jakarta animate-fade-up">
      {/* ONE Single Card Container */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta min-h-0 flex-1 mb-4">
        {/* 1. Header / Greeting Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-border w-full">
          <div className="flex items-center gap-4">
            <Skeleton className="h-11 w-11 rounded-2xl dark:bg-muted shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-52 rounded-lg dark:bg-muted" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28 rounded-full dark:bg-muted" />
                <Skeleton className="h-4 w-44 rounded-full dark:bg-muted" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
            <Skeleton className="h-10 w-36 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* 2. Unified Content Body Skeleton */}
        <div className="p-6 flex flex-col gap-6">
          {/* Urgent Attention Inline Alerts Skeleton */}
          <div className="flex flex-col w-full divide-y divide-gray-100 dark:divide-white/5 rounded-xl overflow-hidden border border-gray-200/80 dark:border-white/10">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 px-4 py-3 border-l-[3px] border-l-amber-400 bg-amber-50/40 dark:bg-amber-950/10"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Skeleton className="h-4 w-4 rounded dark:bg-muted shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-44 rounded dark:bg-muted" />
                    <Skeleton className="h-3 w-72 rounded dark:bg-muted" />
                  </div>
                </div>
                <Skeleton className="h-3.5 w-20 rounded dark:bg-muted shrink-0" />
              </div>
            ))}
          </div>

          {/* Top Row: Active Tracker (Full Width) */}
          <div className="flex flex-col gap-2.5 w-full">
            <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
            <div className="p-5 sm:p-6 rounded-2xl border border-border bg-gray-50/50 dark:bg-zinc-900/30 flex flex-col justify-between gap-4 w-full">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                  <Skeleton className="h-5 w-56 rounded dark:bg-muted" />
                  <Skeleton className="h-3.5 w-40 rounded dark:bg-muted" />
                </div>
                <Skeleton className="h-8 w-24 rounded-xl dark:bg-muted" />
              </div>

              {/* Stepper */}
              <div className="grid grid-cols-4 gap-2.5 pt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <Skeleton className="h-2 w-full rounded-full dark:bg-muted" />
                    <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                  </div>
                ))}
              </div>

              <Skeleton className="h-10 w-full rounded-xl dark:bg-muted mt-1" />
            </div>
          </div>

          {/* Quick Actions Hub (3 Cards) */}
          <div className="flex flex-col gap-2.5 w-full">
            <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-start p-5 rounded-2xl border border-border bg-gray-50/40 dark:bg-zinc-900/30 space-y-2.5"
                >
                  <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
                  <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
                  <Skeleton className="h-3 w-44 rounded dark:bg-muted" />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities Skeleton (100% Width) */}
          <div className="flex flex-col gap-2.5 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-52 rounded dark:bg-muted" />
                <Skeleton className="h-5 w-8 rounded-full dark:bg-muted" />
              </div>
              <Skeleton className="h-8 w-64 rounded-xl dark:bg-muted" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-gray-50/30 dark:bg-zinc-900/20 w-full">
              <div className="divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5">
                    <div className="flex items-start gap-4 flex-1">
                      <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-40 rounded dark:bg-muted" />
                          <Skeleton className="h-4 w-28 rounded dark:bg-muted" />
                          <Skeleton className="h-4 w-24 rounded-full dark:bg-muted" />
                        </div>
                        <Skeleton className="h-3.5 w-3/4 rounded dark:bg-muted" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-5 w-24 rounded-full dark:bg-muted" />
                      <Skeleton className="h-4 w-28 rounded dark:bg-muted" />
                      <Skeleton className="h-8 w-24 rounded-xl dark:bg-muted" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Standard Table Pagination Footer Skeleton */}
              <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl">
                <div className="flex items-center gap-6">
                  <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-8 rounded dark:bg-muted" />
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton key={j} className="h-6 w-7 rounded-lg dark:bg-muted" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-12 rounded-xl dark:bg-muted" />
                  <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
                  <Skeleton className="h-8 w-12 rounded-xl dark:bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

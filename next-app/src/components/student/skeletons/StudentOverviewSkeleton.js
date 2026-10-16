"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function StudentOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full pb-12 select-none font-jakarta animate-fade-up">
      {/* 1. Header / Greeting Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl border border-border bg-white shadow-xs dark:bg-card w-full">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-2xl dark:bg-muted shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-52 rounded-lg dark:bg-muted" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28 rounded-full dark:bg-muted" />
              <Skeleton className="h-4 w-44 rounded-full dark:bg-muted" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
          <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
        </div>
      </div>

      {/* 2. Urgent Attention Banner Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 rounded-2xl border border-amber-200/60 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-950/20"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl dark:bg-amber-900/40 shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-44 rounded dark:bg-amber-900/40" />
                <Skeleton className="h-3 w-60 rounded dark:bg-amber-900/30" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-xl dark:bg-amber-900/40 shrink-0" />
          </div>
        ))}
      </div>

      {/* 3. Top Row: Active Tracker (7/8 cols) + Service Windows (5/4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-2.5">
          <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
          <Card className="p-5 sm:p-6 rounded-2xl border border-border bg-white shadow-xs dark:bg-card flex flex-col justify-between gap-4 h-full">
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
          </Card>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-2.5">
          <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
          <Card className="p-5 rounded-2xl border border-border bg-white shadow-xs dark:bg-card flex flex-col justify-between gap-3.5 h-full">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted shrink-0" />
              <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-lg dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-lg dark:bg-muted" />
            </div>
          </Card>
        </div>
      </div>

      {/* 4. Quick Actions Hub (3 Full-Width Cards) */}
      <div className="flex flex-col gap-2.5 w-full">
        <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-start p-5 rounded-2xl border border-border bg-white shadow-2xs dark:bg-card space-y-2.5"
            >
              <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
              <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
              <Skeleton className="h-3 w-44 rounded dark:bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* 5. FULL-SIZE Recent Activities Skeleton (100% Width) */}
      <div className="flex flex-col gap-2.5 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-52 rounded dark:bg-muted" />
            <Skeleton className="h-5 w-8 rounded-full dark:bg-muted" />
          </div>
          <Skeleton className="h-8 w-64 rounded-xl dark:bg-muted" />
        </div>

        <Card className="p-0 overflow-hidden rounded-2xl border border-border bg-white shadow-xs dark:bg-card w-full">
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
        </Card>
      </div>
    </div>
  );
}

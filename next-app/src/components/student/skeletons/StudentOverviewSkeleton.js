"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function StudentOverviewSkeleton() {
  return (
    <div className="flex flex-col w-full flex-[1_0_auto] select-none font-jakarta animate-fade-up">
      {/* ONE Single Card Container */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* 1. Header / Greeting Skeleton (matches PageHeader with leftAction ProfileAvatar) */}
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
            <Skeleton className="size-11 rounded-full dark:bg-muted shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <Skeleton className="h-5 w-48 sm:w-56 rounded-md dark:bg-muted" />
                <div className="inline-flex items-center gap-1.5 flex-wrap">
                  <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                  <Skeleton className="h-5 w-28 rounded-full dark:bg-muted" />
                </div>
              </div>
              <Skeleton className="mt-[4px] h-3.5 w-72 sm:w-96 max-w-full rounded dark:bg-muted" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted shrink-0" />
            <Skeleton className="h-9 w-36 rounded-xl dark:bg-muted shrink-0" />
          </div>
        </div>

        {/* 2. Unified Content Body Skeleton */}
        <div className="p-6 flex flex-[1_0_auto] flex-col gap-6">
          {/* Urgent Attention Inline Alerts Skeleton */}
          <div className="flex flex-col gap-2.5 w-full">
            <div className="flex items-center gap-2 px-1">
              <Skeleton className="h-2 w-2 rounded-full dark:bg-muted" />
              <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
            </div>
            <div className="flex flex-col gap-2.5 w-full">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:px-5 rounded-2xl border border-border bg-white dark:bg-card"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <Skeleton className="size-10 rounded-full dark:bg-muted shrink-0" />
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Skeleton className="h-4 w-44 rounded dark:bg-muted" />
                        <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
                      </div>
                      <Skeleton className="h-3.5 w-64 sm:w-80 max-w-full rounded dark:bg-muted" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted shrink-0 self-start sm:self-center" />
                </div>
              ))}
            </div>
          </div>

          {/* Top Row: Active Request Tracking (Full Width) */}
          <div className="flex flex-col gap-2.5 w-full">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-40 rounded dark:bg-muted" />
                <Skeleton className="h-5 w-24 rounded-full dark:bg-muted" />
              </div>
              <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
            </div>

            <div className="rounded-2xl border border-border bg-white dark:bg-card flex flex-col justify-between overflow-hidden w-full">
              <div className="p-6 flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-40 rounded dark:bg-muted" />
                      <span className="text-gray-300 dark:text-zinc-700">•</span>
                      <Skeleton className="h-3 w-32 rounded dark:bg-muted" />
                    </div>
                    <Skeleton className="h-5 w-56 sm:w-72 rounded dark:bg-muted" />
                    <Skeleton className="h-3.5 w-44 rounded dark:bg-muted" />
                  </div>
                  <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted shrink-0 self-start sm:self-center" />
                </div>

                {/* 4-Step Progress Stepper */}
                <div className="grid grid-cols-4 gap-2.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <Skeleton className="h-1.5 w-full rounded-full dark:bg-muted" />
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="size-3.5 rounded-full dark:bg-muted shrink-0" />
                        <Skeleton className="h-3 w-16 sm:w-20 rounded dark:bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attached Notice Strip */}
              <div className="flex items-center gap-2.5 px-6 py-2.5 border-t border-border/80 bg-black/[0.02] dark:bg-white/[0.02]">
                <Skeleton className="size-3.5 rounded-full dark:bg-muted shrink-0" />
                <Skeleton className="h-3.5 w-72 sm:w-96 max-w-full rounded dark:bg-muted" />
              </div>
            </div>
          </div>

          {/* Quick Portals & Actions Hub (3 Cards) */}
          <div className="flex flex-col gap-2.5 w-full">
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-3.5 w-44 rounded dark:bg-muted" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-start p-5 rounded-2xl border border-border bg-white dark:bg-card"
                >
                  <div className="flex items-center justify-between w-full">
                    <Skeleton className="size-10 rounded-full dark:bg-muted shrink-0" />
                    <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
                  </div>
                  <Skeleton className="mt-3.5 h-4 w-36 rounded dark:bg-muted" />
                  <Skeleton className="mt-1.5 h-3 w-full rounded dark:bg-muted" />
                  <Skeleton className="mt-1 h-3 w-4/5 rounded dark:bg-muted" />
                  <Skeleton className="mt-3 h-3.5 w-28 rounded dark:bg-muted" />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity & Institutional Updates Skeleton (Top 5 feed, no pagination footer) */}
          <div className="flex flex-[1_0_auto] flex-col gap-2.5 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-56 rounded dark:bg-muted" />
                <Skeleton className="h-5 w-8 rounded-full dark:bg-muted" />
              </div>
              <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] shrink-0 self-start sm:self-auto">
                <Skeleton className="h-7 w-20 rounded-full bg-white dark:bg-zinc-800 shadow-xs" />
                <Skeleton className="h-7 w-28 rounded-full bg-transparent dark:bg-transparent" />
                <Skeleton className="h-7 w-28 rounded-full bg-transparent dark:bg-transparent" />
                <Skeleton className="h-7 w-24 rounded-full bg-transparent dark:bg-transparent" />
              </div>
            </div>

            <div className="flex flex-[1_0_auto] flex-col overflow-hidden rounded-2xl border border-border bg-white dark:bg-card w-full">
              <div className="divide-y divide-border flex-[1_0_auto]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <Skeleton className="size-10 rounded-full dark:bg-muted shrink-0 mt-0.5" />
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Skeleton className="h-4 w-40 rounded dark:bg-muted" />
                          <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                          <Skeleton className="h-5 w-24 rounded-full dark:bg-muted" />
                        </div>
                        <Skeleton className="h-3.5 w-3/4 rounded dark:bg-muted" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="h-5 w-24 rounded-full dark:bg-muted" />
                        <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                      </div>
                      <Skeleton className="h-8 w-24 rounded-xl dark:bg-muted shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function ServiceStandardsSkeleton() {
  return (
    <div className="animate-fade-up font-jakarta flex flex-1 flex-col min-h-full w-full gap-6 pb-6 select-none">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* Page Header */}
        <PageHeader
          icon="ph-clock-countdown"
          title="Service Standards & SLA"
          description="Configure turnaround time standards and compliance rules for document processing."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-20 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-16 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        <div className="h-px bg-gray-100 dark:bg-white/5" />

        <CardContent className="p-6 flex flex-col gap-6">
          {/* Turnaround Framework Presets Bar */}
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-3 w-48 rounded dark:bg-muted" />
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-border/60 dark:border-border">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="flex-1 h-8 rounded-lg dark:bg-muted" />
              ))}
            </div>

            {/* Context Banner */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50/70 dark:bg-zinc-900/40 border border-border dark:border-border">
              <Skeleton className="h-3.5 w-3/4 rounded dark:bg-muted" />
              <Skeleton className="h-6 w-28 rounded-lg dark:bg-muted shrink-0" />
            </div>
          </div>

          {/* Grid Layout: Left Tier Thresholds, Right Live Deadline Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Left Column (lg:col-span-7) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <Skeleton className="h-3 w-48 rounded dark:bg-muted" />

              {/* Framework Title Field */}
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                <Skeleton className="h-2.5 w-80 rounded dark:bg-muted" />
              </div>

              {/* Business Days Toggle Box */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border dark:border-border bg-white dark:bg-card">
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-56 rounded dark:bg-muted" />
                  <Skeleton className="h-2.5 w-80 rounded dark:bg-muted" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full dark:bg-muted" />
              </div>

              {/* 3 Tier Threshold Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-border dark:border-border bg-white dark:bg-card flex flex-col justify-between h-36"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
                        <Skeleton className="h-4 w-12 rounded-full dark:bg-muted" />
                      </div>
                      <Skeleton className="h-2.5 w-28 rounded dark:bg-muted" />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border dark:border-border">
                      <Skeleton className="h-8 w-16 rounded-lg dark:bg-muted" />
                      <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <Skeleton className="h-3 w-40 rounded dark:bg-muted" />

              {/* Simulator Card */}
              <div className="rounded-2xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded dark:bg-muted" />
                  <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                  <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-card border border-border dark:border-border space-y-2">
                  <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                  <Skeleton className="h-6 w-48 rounded dark:bg-muted" />
                </div>
              </div>

              {/* Policy Notice Card */}
              <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded dark:bg-muted" />
                  <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
                </div>
                <Skeleton className="h-3 w-full rounded dark:bg-muted" />
                <Skeleton className="h-3 w-5/6 rounded dark:bg-muted" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

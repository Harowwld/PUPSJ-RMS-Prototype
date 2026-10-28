"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function ServiceStandardsSkeleton() {
  return (
    <div className="animate-fade-up font-jakarta flex flex-[1_0_auto] flex-col w-full gap-6 select-none">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* Page Header */}
        <PageHeader
          icon="ph-clock-countdown"
          title="Processing Time Standards"
          description="Configure turnaround time standards and compliance rules for document processing."
          showBorder={true}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-32 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-32 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        <CardContent className="p-6 flex flex-[1_0_auto] flex-col gap-6 rounded-b-2xl">
          {/* Turnaround Framework Presets Bar */}
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-4 w-48 rounded dark:bg-muted" />
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-border/60">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="flex-1 h-9 rounded-lg dark:bg-muted" />
              ))}
            </div>

            {/* Context Banner */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50/70 dark:bg-zinc-900/40 border border-border/70">
              <div className="flex items-center gap-2.5 flex-1">
                <Skeleton className="h-6 w-6 rounded-lg dark:bg-muted shrink-0" />
                <Skeleton className="h-3.5 w-3/4 rounded dark:bg-muted" />
              </div>
              <Skeleton className="h-6 w-28 rounded-lg dark:bg-muted shrink-0 ml-4" />
            </div>
          </div>

          {/* Grid Layout: Left Tier Thresholds, Right Live Deadline Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Left Column (lg:col-span-7) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <Skeleton className="h-4 w-48 rounded dark:bg-muted" />

              {/* Framework Title Field */}
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                <Skeleton className="h-2.5 w-80 rounded dark:bg-muted" />
              </div>

              {/* Business Days Toggle Box */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border dark:border-border bg-white dark:bg-card">
                <div className="space-y-1.5 max-w-[80%]">
                  <Skeleton className="h-3.5 w-56 rounded dark:bg-muted" />
                  <Skeleton className="h-2.5 w-80 rounded dark:bg-muted" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full dark:bg-muted" />
              </div>

              {/* Tier Stepper Rows */}
              <div className="rounded-xl border border-border/80 dark:border-border bg-white dark:bg-card divide-y divide-border/60 overflow-hidden shadow-2xs">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-2 w-2 rounded-full dark:bg-muted" />
                        <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                        <Skeleton className="h-4 w-16 rounded-full dark:bg-muted" />
                      </div>
                      <Skeleton className="h-2.5 w-60 rounded dark:bg-muted" />
                    </div>
                    <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted shrink-0 ml-4" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <Skeleton className="h-4 w-48 rounded dark:bg-muted" />

              {/* Simulator Card */}
              <div className="rounded-2xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/20 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-border dark:border-border">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2 w-2 rounded-full dark:bg-muted" />
                    <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
                  </div>
                  <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                </div>

                {/* Milestones */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-card border border-border/80 dark:border-border shadow-2xs">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted shrink-0" />
                      <div className="space-y-1">
                        <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
                        <Skeleton className="h-2.5 w-24 rounded dark:bg-muted" />
                      </div>
                    </div>
                    <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                  </div>
                ))}

                {/* Summary Card */}
                <div className="p-4 rounded-xl bg-slate-900 text-white dark:bg-zinc-800/90 border border-slate-800 dark:border-zinc-700/60 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-40 rounded dark:bg-zinc-700" />
                    <Skeleton className="h-4 w-20 rounded-full dark:bg-zinc-700" />
                  </div>
                  <Skeleton className="h-3 w-48 rounded dark:bg-zinc-700 pt-1" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

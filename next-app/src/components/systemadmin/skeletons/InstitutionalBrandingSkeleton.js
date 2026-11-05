"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function InstitutionalBrandingSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        <PageHeader
          icon=" Certificate01Icon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Institutional Identity</span>
              <Skeleton aria-hidden="true" className="h-3.5 w-44 rounded dark:bg-muted" />
            </div>
          }
          description="Configure your official university seal, school credentials, administrative letterhead, and color theme for all official reports."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div aria-hidden="true" className="flex shrink-0 items-center gap-2">
              <Skeleton className="h-8 w-44 shrink-0 rounded-full dark:bg-muted" />
              <Skeleton className="h-9 w-28 shrink-0 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-32 shrink-0 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-28 shrink-0 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        <CardContent className="font-jakarta p-6 flex flex-[1_0_auto] flex-col gap-6 rounded-b-2xl border-t border-border dark:border-border">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (lg:col-span-7): Settings Forms */}
            <div className="lg:col-span-7 space-y-5">
              {/* 1. Official Institutional Seal / Logo Upload Box First */}
              <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-4">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-52 rounded dark:bg-muted" />
                  <Skeleton className="h-3 w-72 rounded dark:bg-muted" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Primary Seal Box */}
                  <div className="rounded-xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-4 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                      <Skeleton className="h-4 w-14 rounded-full dark:bg-muted" />
                    </div>
                    <div className="h-36 rounded-xl border-2 border-dashed border-border dark:border-border bg-white dark:bg-card p-3 flex flex-col items-center justify-center gap-2">
                      <Skeleton className="w-14 h-14 rounded-xl dark:bg-muted" />
                      <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                      <Skeleton className="h-2 w-32 rounded dark:bg-muted" />
                    </div>
                  </div>

                  {/* Secondary Seal Box */}
                  <div className="rounded-xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-4 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                      <Skeleton className="h-4 w-14 rounded-full dark:bg-muted" />
                    </div>
                    <div className="h-36 rounded-xl border-2 border-dashed border-border dark:border-border bg-white dark:bg-card p-3 flex flex-col items-center justify-center gap-2">
                      <Skeleton className="w-12 h-12 rounded-full dark:bg-muted" />
                      <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                      <Skeleton className="h-2 w-32 rounded dark:bg-muted" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. School Credentials Form Fields */}
              <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-4">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-44 rounded dark:bg-muted" />
                  <Skeleton className="h-3 w-64 rounded dark:bg-muted" />
                </div>
                <div className="space-y-4">
                  {/* Super-Header */}
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-40 rounded dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                  </div>
                  {/* Institution Name */}
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-36 rounded dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                  </div>
                  {/* Campus & Office Subheader */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                      <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                    </div>
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-36 rounded dark:bg-muted" />
                      <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                    </div>
                  </div>

                  {/* Derived Document Tracking Prefix Skeleton */}
                  <div className="flex items-center justify-between rounded-xl border border-border bg-gray-50/50 p-3.5 dark:bg-zinc-950/40">
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-44 rounded dark:bg-muted" />
                      <Skeleton className="h-2.5 w-64 rounded dark:bg-muted" />
                    </div>
                    <Skeleton className="h-7 w-20 rounded-lg dark:bg-muted" />
                  </div>

                  {/* Signatory Titles */}
                  <div className="pt-3 border-t border-border dark:border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3.5 w-44 rounded dark:bg-muted" />
                      <Skeleton className="h-2.5 w-32 rounded dark:bg-muted" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
                        <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                      </div>
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                        <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                      </div>
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
                        <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Brand Theme & Typography Combined Box */}
              <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-56 rounded dark:bg-muted" />
                    <Skeleton className="h-3 w-72 rounded dark:bg-muted" />
                  </div>
                  <div className="space-y-4 rounded-2xl border border-border bg-gray-50/50 p-4 dark:bg-zinc-950/40 sm:p-5">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                        <Skeleton key={i} className="size-12 rounded-full dark:bg-muted" />
                      ))}
                    </div>
                    <div className="flex items-center gap-3 pt-3 border-t border-border">
                      <Skeleton className="size-12 rounded-full dark:bg-muted" />
                      <Skeleton className="h-10 w-32 rounded-xl dark:bg-muted" />
                    </div>
                  </div>
                </div>

                {/* Combined Report Typography Skeleton below */}
                <div className="pt-5 border-t border-border dark:border-border space-y-3.5">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
                    <Skeleton className="h-3 w-72 rounded dark:bg-muted" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                    <Skeleton className="h-6 w-full rounded dark:bg-muted" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (lg:col-span-5): Document Preview */}
            <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
              <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-52 rounded dark:bg-muted" />
                    <Skeleton className="h-3 w-64 rounded dark:bg-muted" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full dark:bg-muted" />
                </div>
                {/* Simulated A4 Canvas Sheet */}
                <div className="rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-950 p-6 flex flex-col items-center justify-between h-[calc(100vh-190px)] min-h-[560px] max-h-[840px] shadow-xs">
                  <div className="w-full flex flex-col items-center gap-3 border-b border-border dark:border-border pb-4">
                    <Skeleton className="w-12 h-12 rounded-full dark:bg-muted" />
                    <Skeleton className="h-3.5 w-48 rounded dark:bg-muted" />
                    <Skeleton className="h-2.5 w-32 rounded dark:bg-muted" />
                  </div>
                  <div className="w-full space-y-3 py-6 flex-1 max-w-sm">
                    <Skeleton className="h-3 w-full rounded dark:bg-muted" />
                    <Skeleton className="h-3 w-5/6 rounded dark:bg-muted" />
                    <Skeleton className="h-3 w-4/6 rounded dark:bg-muted" />
                    <Skeleton className="h-24 w-full rounded-xl dark:bg-muted mt-4" />
                  </div>
                  <div className="w-full flex justify-between pt-4 border-t border-border dark:border-border">
                    <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
                    <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

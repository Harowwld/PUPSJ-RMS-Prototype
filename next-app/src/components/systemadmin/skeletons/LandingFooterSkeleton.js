"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import LandingCmsViewTabs from "../LandingCmsViewTabs"

export default function LandingFooterSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex min-w-0 flex-[1_0_auto] h-auto w-full flex-col gap-0 overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none isolate font-jakarta">
        <PageHeader
          icon=" LayoutBottomIcon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Landing Page CMS</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400">
                Footer Section
              </span>
            </div>
          }
          description="Customize campus archive location, registrar window schedules, contacts, ambient watermark, and copyright."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex shrink-0 items-center gap-2 flex-wrap">
              <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-36 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        {/* Tab switcher skeleton */}
        <LandingCmsViewTabs activeTab="content" onChange={() => {}} contentLabel="Footer Content" />

        <LandingFooterSkeletonContent />
      </Card>
    </div>
  )
}

export function LandingFooterSkeletonContent() {
  return (
    <CardContent aria-busy="true" className="font-jakarta p-6 flex flex-[1_0_auto] flex-col gap-6 rounded-b-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (lg:col-span-6) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-5">
            <div>
              <div className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                Physical Archive Location
              </div>
              <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300 mt-0.5">
                Credentials and archive hall details displayed in Column 1.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-44 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-44 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>
            </div>
          </div>

          {/* Map Directions Box */}
          <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-4">
            <Skeleton className="h-4 w-40 rounded dark:bg-muted" />
            <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
          </div>

          {/* Watermark Box */}
          <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-4">
            <Skeleton className="h-4 w-52 rounded dark:bg-muted" />
            <Skeleton className="h-24 w-full rounded-xl dark:bg-muted" />
          </div>

          {/* Sub-Footer & Copyright */}
          <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-4">
            <Skeleton className="h-4 w-44 rounded dark:bg-muted" />
            <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Right Column (lg:col-span-6) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-4">
            <Skeleton className="h-4 w-44 rounded dark:bg-muted" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              <Skeleton className="h-14 w-full rounded-xl dark:bg-muted" />
              <Skeleton className="h-14 w-full rounded-xl dark:bg-muted" />
            </div>
          </div>

          <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-4">
            <Skeleton className="h-4 w-48 rounded dark:bg-muted" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              <Skeleton className="h-14 w-full rounded-xl dark:bg-muted" />
              <Skeleton className="h-14 w-full rounded-xl dark:bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  )
}

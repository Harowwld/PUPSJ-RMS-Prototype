"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import LandingCmsViewTabs from "../LandingCmsViewTabs"

export default function LandingCatalogSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex min-w-0 flex-[1_0_auto] h-auto w-full flex-col gap-0 overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none isolate font-jakarta">
        <PageHeader
          icon=" LibraryIcon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Landing Page CMS</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                15 documents · Academic Document Catalog
              </span>
            </div>
          }
          description="Configure authentic university credentials, document codes, client eligibility tags, and filing requirements for the Apple-style carousel."
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

        {/* Standard Navigation Segmented Tabs */}
        <LandingCmsViewTabs activeTab="content" onChange={() => {}} contentLabel="Catalog Content" />

        <LandingCatalogSkeletonContent />
      </Card>
    </div>
  )
}

export function LandingCatalogSkeletonContent() {
  return (
    <CardContent aria-busy="true" className="p-6 flex flex-[1_0_auto] flex-col rounded-b-2xl">
      <div className="space-y-6">
        {/* Section Header & Subtitle Skeleton */}
        <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-5">
          <div className="space-y-1">
            <Skeleton className="h-4 w-48 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-80 rounded dark:bg-muted" />
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-32 rounded dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-32 rounded dark:bg-muted" />
              <Skeleton className="h-[84px] w-full rounded-xl dark:bg-muted" />
            </div>
          </div>
        </div>

        {/* Cards Management Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: DOCUMENT CARD LIST */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                    Catalog Credentials
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-sans tabular-nums">
                    15 of 15
                  </span>
                </div>
                <p className="text-xs text-gray-900 dark:text-zinc-300 mt-0.5">
                  Select a credential to edit or adjust its order in the carousel.
                </p>
              </div>

              <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
            </div>

            {/* Cards List */}
            <div className="flex flex-col gap-2.5">
              {/* Item 1: Active Selected Card */}
              <div className="p-3.5 rounded-2xl border border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 flex items-center gap-3.5 select-none shadow-xs ring-1 ring-black/10 dark:ring-white/20">
                <div className="w-7 h-7 rounded-full bg-gray-950 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-sans tabular-nums text-[11px] font-bold shrink-0 shadow-xs">
                  01
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
                  <Skeleton className="h-3 w-44 rounded dark:bg-muted" />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Skeleton className="w-7 h-7 rounded-lg dark:bg-muted" />
                  <Skeleton className="w-7 h-7 rounded-lg dark:bg-muted" />
                  <Skeleton className="w-7 h-7 rounded-lg dark:bg-muted" />
                </div>
              </div>

              {/* Items 2-4: Inactive Cards */}
              {["02", "03", "04"].map((pos) => (
                <div
                  key={pos}
                  className="p-3.5 rounded-2xl border border-border dark:border-border bg-white dark:bg-zinc-900/50 flex items-center gap-3.5 select-none"
                >
                  <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 flex items-center justify-center font-sans tabular-nums text-[11px] font-bold shrink-0">
                    {pos}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
                    <Skeleton className="h-3 w-40 rounded dark:bg-muted" />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Skeleton className="w-7 h-7 rounded-lg dark:bg-muted" />
                    <Skeleton className="w-7 h-7 rounded-lg dark:bg-muted" />
                    <Skeleton className="w-7 h-7 rounded-lg dark:bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: ACTIVE CARD EDITOR */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-border dark:border-border">
                <div className="space-y-1">
                  <span className="text-[10px] font-sans tabular-nums uppercase font-bold text-pup-maroon dark:text-red-400 tracking-wider">
                    Document Card Editor
                  </span>
                  <Skeleton className="h-5 w-48 rounded dark:bg-muted" />
                </div>
                <Skeleton className="h-6 w-28 rounded-full dark:bg-muted" />
              </div>

              {/* Title Skeleton */}
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-32 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>

              {/* Client Tag Skeleton */}
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>

              {/* Description Skeleton */}
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-36 rounded dark:bg-muted" />
                <Skeleton className="h-16 w-full rounded-xl dark:bg-muted" />
              </div>

              {/* Requirements Skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-40 rounded dark:bg-muted" />
                <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />
                <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  )
}

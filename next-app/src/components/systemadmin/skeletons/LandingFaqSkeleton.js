"use client"


import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import LandingCmsViewTabs from "../LandingCmsViewTabs"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import { ArrowDown01Icon } from "hugeicons-react";


export default function LandingFaqSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex min-w-0 flex-[1_0_auto] h-auto w-full flex-col gap-0 overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none isolate font-jakarta">
        <PageHeader
          icon=" HelpCircleIcon"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Landing Page CMS</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · FAQ Section
              </span>
            </div>
          }
          description="Manage frequently asked questions, detailed answers, and category tags."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-36 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        {/* Standardized SuperAdmin Navigation Segmented Tabs */}
        <LandingCmsViewTabs activeTab="content" onChange={() => {}} contentLabel="FAQ Content" />

        <CardContent className="font-jakarta p-6 flex flex-[1_0_auto] flex-col gap-6 rounded-b-2xl">
          <div className="space-y-5">
            {/* Section Header & Subtitle Skeleton */}
            <div className="w-full rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-5">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-52 rounded dark:bg-muted" />
                <Skeleton className="h-3 w-80 rounded dark:bg-muted" />
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                  <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-36 rounded dark:bg-muted" />
                  <Skeleton className="h-[84px] w-full rounded-xl dark:bg-muted" />
                </div>
              </div>
            </div>
            {/* Header Action Bar */}
            <div className="flex min-w-0 flex-col rounded-2xl border border-border dark:border-border bg-white dark:bg-card overflow-hidden shadow-2xs">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                      Questions &amp; Answers List
                    </span>
                    <span className="text-[11px] font-normal text-gray-500 dark:text-zinc-400 font-sans tabular-nums">
                      8/16
                    </span>
                  </div>
                  <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300 mt-0.5">
                    Expand any question below to edit its text, category, or order.
                  </p>
                </div>

                <Skeleton className="h-9 w-32 shrink-0 rounded-xl dark:bg-muted" />
              </div>

              <DataViewToolbar label="FAQ search and category filter" className="w-full gap-2 border-t border-border dark:border-border bg-white px-4 py-3 dark:bg-card">
                <div className="relative w-72 sm:w-80 shrink-0"><Skeleton className="h-9 w-full rounded-xl dark:bg-muted" /><Skeleton className="absolute right-2.5 top-1/2 h-3 w-6 -translate-y-1/2 rounded dark:bg-muted" /></div>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
                </div>
              </DataViewToolbar>
            </div>

            {/* FAQ Accordion Items */}
            <div className="space-y-3">
              {/* FAQ 1: EXPANDED ACCORDION */}
              <div className="rounded-xl border border-pup-maroon/30 dark:border-red-500/30 bg-white dark:bg-zinc-900/60 shadow-xs overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-4 bg-gray-50/60 dark:bg-zinc-800/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <Skeleton className="h-4 w-64 rounded dark:bg-muted" />
                    <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                    <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                    <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                    <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                    <div className="h-4 w-px bg-gray-200 dark:bg-white/10 mx-1" />
                    <ArrowDown01Icon size="1em"  className="text-gray-400 text-sm rotate-180" />
                  </div>
                </div>

                {/* Expanded Question Form */}
                <div className="p-5 pt-3 space-y-4 border-t border-border dark:border-border">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5 md:col-span-1">
                      <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                      <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                    </div>
                    <div className="space-y-1.5 md:col-span-3">
                      <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                      <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-32 rounded dark:bg-muted" />
                    <Skeleton className="h-20 w-full rounded-xl dark:bg-muted" />
                  </div>
                </div>
              </div>

              {/* FAQS 2-5: COLLAPSED ACCORDIONS */}
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-900/30 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3 p-4 bg-transparent">
                    <div className="flex items-center gap-3 min-w-0">
                      <Skeleton className="h-4 w-56 sm:w-80 rounded dark:bg-muted" />
                      <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                      <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                      <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                      <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                      <div className="h-4 w-px bg-gray-200 dark:bg-white/10 mx-1" />
                      <ArrowDown01Icon size="1em"  className="text-gray-400 text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

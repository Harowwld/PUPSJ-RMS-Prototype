"use client"


import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import LandingCmsViewTabs from "../LandingCmsViewTabs"
import { ArrowDown01Icon } from "hugeicons-react";


export default function LandingWorkflowSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex min-w-0 flex-[1_0_auto] h-auto w-full flex-col gap-0 overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none isolate font-jakarta">
        <PageHeader
          icon=" GitMergeIcon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Landing Page CMS</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                5 steps · Workflow &amp; Steps
              </span>
            </div>
          }
          description="Manage public portal process workflow, student application steps, and left-column narrative."
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
        <LandingCmsViewTabs activeTab="content" onChange={() => {}} contentLabel="Workflow Content" />

        <LandingWorkflowSkeletonContent />
      </Card>
    </div>
  )
}

export function LandingWorkflowSkeletonContent() {
  return (
    <CardContent aria-busy="true" className="font-jakarta p-6 flex flex-[1_0_auto] flex-col gap-6 rounded-b-2xl">
      <div className="space-y-6">
        {/* Section Title & Narrative Copy Skeleton */}
        <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-5">
          <div className="space-y-1">
            <Skeleton className="h-4 w-52 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-80 rounded dark:bg-muted" />
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-32 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-32 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-40 rounded dark:bg-muted" />
              <Skeleton className="h-20 w-full rounded-xl dark:bg-muted" />
            </div>
          </div>
        </div>

        {/* Header Bar with Curve Style & Add Step Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                Sequential Application Process
              </span>
              <span className="text-xs font-sans tabular-nums font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                5 of 7 Steps
              </span>
            </div>
            <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300 mt-0.5">
              Reorder, rename, or customize step requirements. Numbers are assigned automatically in sequential order.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Skeleton className="h-9 w-44 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-20 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Workflow Steps Accordion */}
        <div className="space-y-4">
          {/* STEP 1 ACCORDION: EXPANDED */}
          <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card shadow-xs overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gray-50/40 dark:bg-zinc-900/20 rounded-2xl">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gray-950 dark:bg-zinc-100 text-white dark:text-zinc-900 font-sans tabular-nums text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                  01
                </div>
                <div className="min-w-0 space-y-1">
                  <Skeleton className="h-4 w-40 rounded dark:bg-muted" />
                  <Skeleton className="h-3 w-56 rounded dark:bg-muted" />
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
                <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
                <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
                <div className="h-4 w-px bg-gray-200 dark:bg-white/10 mx-1" />
                <ArrowDown01Icon size="1em"  className="text-gray-400 text-sm rotate-180" />
              </div>
            </div>

            <div className="p-5 space-y-4 border-t border-border dark:border-border">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-36 rounded dark:bg-muted" />
                <Skeleton className="h-20 w-full rounded-xl dark:bg-muted" />
              </div>
            </div>
          </div>

          {/* STEPS 2-4 ACCORDIONS: COLLAPSED */}
          {["02", "03", "04"].map((stepNum) => (
            <div
              key={stepNum}
              className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card shadow-2xs overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 bg-gray-50/40 dark:bg-zinc-900/20 rounded-2xl">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 font-sans tabular-nums text-xs font-bold flex items-center justify-center shrink-0">
                    {stepNum}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
                    <Skeleton className="h-3 w-60 rounded dark:bg-muted" />
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
                  <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
                  <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
                  <div className="h-4 w-px bg-gray-200 dark:bg-white/10 mx-1" />
                  <ArrowDown01Icon size="1em"  className="text-gray-400 text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  )
}

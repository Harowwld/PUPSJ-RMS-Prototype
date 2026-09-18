"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function LandingWorkflowSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-git-merge"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Landing Page CMS</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · Workflow &amp; Steps
              </span>
            </div>
          }
          description="Manage public portal process workflow, student application steps, and left-column narrative."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Skeleton className="h-10 w-28 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-28 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-32 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        {/* Standard Underline Tabs */}
        <div className="flex items-center gap-6 shrink-0 h-10 px-6 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card select-none">
          <div className="relative h-full flex items-center text-[13px] font-semibold text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50">
            Workflow Steps (4/6)
          </div>
          <div className="relative h-full flex items-center text-[13px] text-[#8E8E93] font-normal">
            Section Header &amp; Editorial
          </div>
          <div className="relative h-full flex items-center text-[13px] text-[#8E8E93] font-normal">
            Interactive Live Preview
          </div>
        </div>

        {/* Content Body */}
        <CardContent className="font-jakarta bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-6">
          <div className="space-y-6">
            {/* Header Bar with Curve Style & Add Step Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Sequential Application Process
                  </span>
                  <span className="text-xs font-mono font-medium text-pup-maroon dark:text-red-400 bg-pup-maroon/10 dark:bg-red-500/10 px-2 py-0.5 rounded-full">
                    4 of 6 Steps
                  </span>
                </div>
                <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                  Reorder, rename, or customize step requirements. Capped at 6 steps to keep instructions clear and mobile layouts compact.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Skeleton className="h-9 w-44 rounded-xl dark:bg-muted" />
                <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
              </div>
            </div>

            {/* Workflow Steps Accordion */}
            <div className="space-y-4">
              {/* STEP 1 ACCORDION: EXPANDED */}
              <div className="rounded-xl border border-pup-maroon/40 dark:border-red-500/40 bg-white dark:bg-card shadow-xs overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-gray-50/40 dark:bg-zinc-900/20 rounded-xl">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-pup-maroon dark:bg-red-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
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
                    <HugeIcon  className="ph-bold ph-caret-down text-gray-400 text-sm rotate-180" />
                  </div>
                </div>

                <div className="p-5 space-y-4 border-t border-gray-100 dark:border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
                      <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                    </div>
                    <div className="space-y-1.5">
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

              {/* STEPS 2-4 ACCORDIONS: COLLAPSED */}
              {["02", "03", "04"].map((stepNum) => (
                <div
                  key={stepNum}
                  className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-card shadow-2xs overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4 bg-gray-50/40 dark:bg-zinc-900/20 rounded-xl">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-pup-maroon dark:bg-red-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
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
                      <HugeIcon  className="ph-bold ph-caret-down text-gray-400 text-sm" />
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

"use client"

import LucideIcon from "@/components/shared/LucideIcon";
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function LandingFaqSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-question"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Landing Page CMS</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · FAQ Section
              </span>
            </div>
          }
          description="Manage frequently asked questions, detailed answers, category tags, and registrar support desk assistance."
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

        {/* Standardized SuperAdmin Underline Navigation Tabs */}
        <div className="flex items-center gap-6 shrink-0 h-10 px-6 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card select-none overflow-x-auto">
          <div className="relative h-full flex items-center text-[13px] font-semibold text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50">
            Questions &amp; Answers (8)
          </div>
          <div className="relative h-full flex items-center text-[13px] text-[#8E8E93] font-normal">
            Section Header &amp; Subtitle
          </div>
          <div className="relative h-full flex items-center text-[13px] text-[#8E8E93] font-normal">
            Interactive Live Preview
          </div>
        </div>

        {/* Content Body */}
        <CardContent className="font-inter bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-6">
          <div className="space-y-5">
            {/* Header Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Questions &amp; Answers List
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-mono">
                    8/12
                  </span>
                </div>
                <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                  Expand any question below to edit its text, category, or order.
                </p>
              </div>

              <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
            </div>

            {/* Category Filter Bar */}
            <div className="flex items-center gap-1.5 flex-wrap select-none pt-1">
              <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 mr-1 uppercase tracking-wider">
                Filter:
              </span>
              <Skeleton className="h-6 w-16 rounded-lg dark:bg-muted" />
              <Skeleton className="h-6 w-20 rounded-lg dark:bg-muted" />
              <Skeleton className="h-6 w-24 rounded-lg dark:bg-muted" />
              <Skeleton className="h-6 w-24 rounded-lg dark:bg-muted" />
              <Skeleton className="h-6 w-20 rounded-lg dark:bg-muted" />
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
                    <LucideIcon  className="ph-bold ph-caret-down text-gray-400 text-sm rotate-180" />
                  </div>
                </div>

                {/* Expanded Question Form */}
                <div className="p-5 pt-3 space-y-4 border-t border-gray-100 dark:border-white/10">
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
                  className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/30 overflow-hidden"
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
                      <LucideIcon  className="ph-bold ph-caret-down text-gray-400 text-sm" />
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

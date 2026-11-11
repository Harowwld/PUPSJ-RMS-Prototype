"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import DataViewToolbar from "@/components/shared/DataViewToolbar"

export default function SecurityQuestionsSkeleton() {
  return (
    <div className="flex w-full flex-[1_0_auto] flex-col gap-6 font-jakarta animate-fade-up">
      <Card className="isolate flex h-auto w-full flex-[1_0_auto] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-sm dark:bg-card dark:shadow-none">
        <PageHeader
          icon=" Shield01Icon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Security Questions</span>
              <Skeleton aria-hidden="true" className="h-3.5 w-36 rounded dark:bg-muted" />
              <Skeleton aria-hidden="true" className="h-4 w-28 rounded-full dark:bg-muted" />
            </div>
          }
          description="Define institutional verification challenges for staff account recovery. Mark mandatory challenges as Required (minimum 10 characters)."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="mt-[4px] text-[13px] font-normal text-gray-900 dark:text-zinc-300"
          actions={<div aria-hidden="true" className="flex shrink-0 gap-2"><Skeleton className="h-9 w-32 rounded-xl" /><Skeleton className="h-9 w-32 rounded-xl" /></div>}
        />
        <div aria-hidden="true" className="flex items-center px-6 py-2.5 border-b border-border/80 dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none">
          <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08]">
            {["All", "Required", "Optional"].map((label, index) => (
              <div
                key={label}
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full ${
                  index === 0
                    ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs"
                    : "text-gray-500 dark:text-zinc-400"
                }`}
              >
                <span>{label}</span>
                <Skeleton className="h-3 w-5 rounded-full dark:bg-muted" />
              </div>
            ))}
          </div>
        </div>
        <DataViewToolbar label="Security question search" className="gap-2 bg-white p-4 dark:bg-card sm:px-5 sm:py-3">
          <div className="relative w-72 sm:w-80 shrink-0"><Skeleton className="h-9 w-full rounded-xl" /><Skeleton className="absolute right-2.5 top-1/2 h-3 w-6 -translate-y-1/2 rounded" /></div>
        </DataViewToolbar>
        <SecurityQuestionsSkeletonContent />
      </Card>
    </div>
  )
}

export function SecurityQuestionsSkeletonContent() {
  return (
    <div aria-busy="true" className="flex flex-[1_0_auto] flex-col space-y-4 border-t border-border p-6 dark:border-border">
      {[1, 2].map((i) => <div key={i} className="space-y-2.5 rounded-2xl border border-border bg-gray-50/30 p-4 dark:bg-zinc-900/40">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="h-4 w-20 rounded" /><Skeleton className="h-5 w-16 rounded-full" /></div><div className="flex gap-2"><Skeleton className="h-8 w-36 rounded-xl" /><Skeleton className="h-8 w-8 rounded-xl" /></div></div>
        <Skeleton className="h-10.5 w-full rounded-xl" />
        <Skeleton className="h-3.5 w-64 max-w-full rounded" />
      </div>)}
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  )
}

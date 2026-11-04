"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import DataViewToolbar from "@/components/shared/DataViewToolbar"

export default function SecurityQuestionsSkeleton() {
  return (
    <div className="flex w-full flex-[1_0_auto] flex-col gap-6 font-jakarta animate-fade-up">
      <Card className="isolate flex h-auto w-full flex-[1_0_auto] flex-col gap-0 overflow-visible rounded-2xl border border-border bg-white p-0 shadow-sm dark:bg-card dark:shadow-none">
        <PageHeader
          icon=" Shield01Icon"
          title={<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span>Security Questions</span><Skeleton aria-hidden="true" className="h-3.5 w-36 rounded" /></div>}
          description="Define institutional verification challenges for staff account recovery. Mark mandatory challenges as Required (minimum 10 characters)."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="mt-[4px] text-[13px] font-normal text-gray-900 dark:text-zinc-300"
          actions={<div aria-hidden="true" className="flex shrink-0 gap-2"><Skeleton className="h-9 w-32 rounded-xl" /><Skeleton className="h-9 w-32 rounded-xl" /></div>}
        />
        <div className="flex h-9 items-stretch overflow-hidden border-b border-border px-6 dark:border-white/10">
          {["All", "Required", "Optional"].map((label, index) => <div key={label} className="relative flex items-center gap-2 px-3 text-xs font-semibold text-gray-500 dark:text-zinc-400">{label}<Skeleton className="h-3 w-5 rounded" />{index === 0 && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-pup-maroon dark:bg-red-400" />}</div>)}
        </div>
        <DataViewToolbar label="Security question search" className="gap-2 bg-gray-50/40 p-4 dark:bg-zinc-900/30 sm:px-5 sm:py-3">
          <Skeleton className="h-9 w-[min(320px,60vw)] min-w-[190px] shrink-0 rounded-xl" />
        </DataViewToolbar>
        <div aria-busy="true" className="flex flex-[1_0_auto] flex-col space-y-4 border-t border-border p-6 dark:border-border">
          {[1, 2].map((i) => <div key={i} className="space-y-2.5 rounded-2xl border border-border bg-gray-50/30 p-4 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Skeleton className="h-6 w-6 rounded-lg" /><Skeleton className="h-4 w-20 rounded" /><Skeleton className="h-5 w-16 rounded-full" /></div><div className="flex gap-2"><Skeleton className="h-8 w-36 rounded-xl" /><Skeleton className="h-8 w-8 rounded-xl" /></div></div>
            <Skeleton className="h-10.5 w-full rounded-xl" />
            <Skeleton className="h-3.5 w-64 max-w-full rounded" />
          </div>)}
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </Card>
    </div>
  )
}

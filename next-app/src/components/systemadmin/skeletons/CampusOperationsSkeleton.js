"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/shared/PageHeader"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import TransactionsTableSkeleton from "@/components/systemadmin/skeletons/TransactionsTableSkeleton"

export default function CampusOperationsSkeleton() {
  return (
    <div className="flex w-full flex-[1_0_auto] flex-col gap-6 font-jakarta animate-fade-up select-none">
      <Card className="isolate flex h-auto w-full flex-[1_0_auto] flex-col gap-0 overflow-visible rounded-2xl border border-border bg-white p-0 shadow-sm dark:border-border dark:bg-card dark:shadow-none">
        <PageHeader
          title={<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span>Campus Services &amp; Operations Monitor</span><Skeleton className="h-3.5 w-40 rounded dark:bg-muted" /></div>}
          description="Live tracking of student document requests and student organization proposals across campus departments."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="mt-[4px] text-[13px] font-normal text-gray-900 dark:text-zinc-300"
        />
        <div aria-hidden="true" className="flex h-9 items-stretch overflow-x-auto border-b border-border px-6 dark:border-white/10">
          {["All", "Open", "Closed"].map((label, index) => <div key={label} className={`relative inline-flex items-center gap-2 px-3 text-xs font-semibold ${index === 0 ? "text-pup-maroon dark:text-red-400" : "text-gray-500 dark:text-zinc-400"}`}>{label}<Skeleton className="h-3 w-6 rounded dark:bg-muted" />{index === 0 && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-pup-maroon dark:bg-red-400" />}</div>)}
        </div>
        <DataViewToolbar label="Campus operations search and filters" className="gap-2 bg-gray-50/40 p-4 dark:bg-zinc-900/30 sm:px-5 sm:py-3">
          <div aria-hidden="true" className="flex min-w-0 items-center gap-2" style={{ flex: "1 0 auto" }}>
            <div className="relative w-[min(320px,30vw)] min-w-[190px] shrink-0"><Skeleton className="h-9 w-full rounded-xl dark:bg-muted" /><Skeleton className="absolute right-3 top-1/2 h-3 w-6 -translate-y-1/2 rounded dark:bg-muted" /></div>
            <Skeleton className="h-9 w-20 shrink-0 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-32 shrink-0 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-32 shrink-0 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-xl dark:bg-muted" />
          </div>
          <Skeleton aria-hidden="true" className="ml-auto h-9 w-9 shrink-0 rounded-xl dark:bg-muted" />
        </DataViewToolbar>
        <div className="flex flex-col gap-2 border-t border-border bg-gray-50/40 px-6 py-4 dark:bg-zinc-900/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" /><div className="space-y-2"><Skeleton className="h-4 w-64 max-w-full rounded dark:bg-muted" /><Skeleton className="h-3 w-80 max-w-full rounded dark:bg-muted" /></div></div>
          <Skeleton className="h-9 w-40 shrink-0 rounded-xl dark:bg-muted" />
        </div>
        <div aria-busy="true" className="flex flex-[1_0_auto] flex-col overflow-hidden rounded-b-2xl border-t border-border bg-white dark:bg-card">
          <TransactionsTableSkeleton rowCount={20} />
        </div>
      </Card>
    </div>
  )
}

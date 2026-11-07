"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/shared/PageHeader"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import TransactionsTableSkeleton from "@/components/systemadmin/skeletons/TransactionsTableSkeleton"

export default function CampusOperationsSkeleton() {
  return (
    <div className="flex w-full flex-[1_0_auto] flex-col gap-6 font-jakarta animate-fade-up select-none">
      <Card className="isolate flex h-auto w-full flex-[1_0_auto] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-sm dark:border-border dark:bg-card dark:shadow-none">
        <PageHeader
          title={<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span>Campus Services &amp; Operations Monitor</span><Skeleton className="h-3.5 w-40 rounded dark:bg-muted" /></div>}
          description="Live tracking of student document requests and student organization proposals across campus departments."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="mt-[4px] text-[13px] font-normal text-gray-900 dark:text-zinc-300"
          actions={
            <div className="flex shrink-0 items-center gap-2">
              <Skeleton aria-hidden="true" className="h-9 w-9 shrink-0 rounded-xl dark:bg-muted" />
              <Skeleton aria-hidden="true" className="h-9 w-24 shrink-0 rounded-xl dark:bg-muted" />
              <Skeleton aria-hidden="true" className="h-9 w-24 shrink-0 rounded-xl dark:bg-muted" />
            </div>
          }
        />
        <div aria-hidden="true" className="flex items-center justify-between gap-4 px-6 py-2.5 border-b border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none">
          <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08]">
            {["All", "Open", "Closed"].map((label, index) => (
              <div key={label} className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full ${index === 0 ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400"}`}>
                <span>{label}</span>
                <Skeleton className="h-3 w-5 rounded-full dark:bg-muted" />
              </div>
            ))}
          </div>

          <div className="ml-auto inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08]">
            <Skeleton className="h-6 w-16 rounded-full dark:bg-muted" />
            <Skeleton className="h-6 w-16 rounded-full dark:bg-muted" />
          </div>
        </div>
        <DataViewToolbar label="Campus operations search and filters" className="gap-2 bg-white p-4 dark:bg-card sm:px-5 sm:py-3">
          <div aria-hidden="true" className="flex min-w-0 items-center gap-2">
            <div className="relative w-72 sm:w-80 shrink-0"><Skeleton className="h-9 w-full rounded-xl dark:bg-muted" /><Skeleton className="absolute right-2.5 top-1/2 h-3 w-6 -translate-y-1/2 rounded dark:bg-muted" /></div>
          </div>
          <div aria-hidden="true" className="ml-auto flex shrink-0 items-center gap-2">
            <Skeleton className="h-9 w-20 shrink-0 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-32 shrink-0 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-32 shrink-0 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-xl dark:bg-muted" />
          </div>
        </DataViewToolbar>
        <div className="flex flex-col gap-2 border-t border-border bg-white px-6 py-4 dark:bg-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full dark:bg-muted" /><div className="space-y-2"><Skeleton className="h-4 w-64 max-w-full rounded dark:bg-muted" /><Skeleton className="h-3 w-80 max-w-full rounded dark:bg-muted" /></div></div>
          <Skeleton className="h-9 w-40 shrink-0 rounded-xl dark:bg-muted" />
        </div>
        <div aria-busy="true" className="flex flex-[1_0_auto] flex-col overflow-hidden rounded-b-2xl border-t border-border bg-white dark:bg-card">
          <TransactionsTableSkeleton rowCount={20} />
        </div>
      </Card>
    </div>
  )
}

"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import DirectoryTableSkeleton from "@/components/systemadmin/skeletons/DirectoryTableSkeleton"

export default function GlobalStaffSkeleton({ columns, layoutView = "table" }) {
  return (
    <div className="flex w-full flex-[1_0_auto] flex-col font-jakarta animate-fade-up">
      <Card className="flex w-full flex-[1_0_auto] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-sm dark:bg-card dark:shadow-none">
        <PageHeader
          icon="UserSearch01Icon"
          title={<div className="flex flex-wrap items-baseline gap-3"><span>Global Personnel Directory</span><Skeleton className="h-3 w-36" /></div>}
          description="Manage system access, office assignments, and authorization settings for all administrators and records staff."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300"
          actions={<div className="flex shrink-0 gap-2"><Skeleton className="h-9 w-9 rounded-xl" /><Skeleton className="h-9 w-36 rounded-xl" /></div>}
        />
        <div aria-hidden="true" className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none">
          <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shrink-0">
            {["Active", "Archived"].map((label, index) => (
              <div key={label} className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full ${index === 0 ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400"}`}>
                <span>{label}</span>
                <Skeleton className="h-3 w-5 rounded-full dark:bg-muted" />
              </div>
            ))}
          </div>

          <div className="ml-auto inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shrink-0">
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full text-gray-500 dark:text-zinc-400">
              <Skeleton className="h-3.5 w-12 rounded-full dark:bg-muted" />
            </div>
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs">
              <Skeleton className="h-3.5 w-12 rounded-full dark:bg-muted" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 overflow-hidden bg-white p-4 dark:bg-card sm:px-5 sm:py-3">
          <div className="relative w-72 sm:w-80 shrink-0"><Skeleton className="h-9 w-full rounded-xl" /><Skeleton className="absolute right-2.5 top-1/2 h-3 w-6 -translate-y-1/2 rounded" /></div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {[72, 120, 126, ...(layoutView === "table" ? [120] : [])].map((width, index) => <Skeleton key={index} style={{ width }} className="h-9 shrink-0 rounded-xl" />)}
          </div>
        </div>
        <div className="border-t border-border dark:border-border">
          {layoutView === "grid" ? (
            <div className="p-6 flex-[1_0_auto] bg-gray-50/30 dark:bg-zinc-900/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col justify-between p-4 rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <Skeleton className="size-9 rounded-full dark:bg-muted shrink-0" />
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                          <Skeleton className="h-2.5 w-36 rounded dark:bg-muted" />
                        </div>
                      </div>
                      <Skeleton className="size-6 rounded-lg dark:bg-muted shrink-0" />
                    </div>
                    <div className="mt-3.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50/80 dark:bg-zinc-900/50 divide-y divide-black/[0.05] dark:divide-white/[0.06] overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2">
                        <Skeleton className="h-3 w-10 rounded dark:bg-muted" />
                        <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <Skeleton className="h-3 w-12 rounded dark:bg-muted" />
                        <Skeleton className="h-4 w-16 rounded-full dark:bg-muted" />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <Skeleton className="h-3 w-14 rounded dark:bg-muted" />
                        <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                      </div>
                    </div>
                    <div className="mt-3 pt-0.5 flex items-center justify-between">
                      <Skeleton className="h-5 w-24 rounded-full dark:bg-muted" />
                      <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                    </div>
                  </div>
                ))}
                <div className="flex min-h-[196px] w-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-black/[0.14] dark:border-white/15 bg-white/60 dark:bg-zinc-900/30 p-4">
                  <Skeleton className="size-10 rounded-full dark:bg-muted" />
                  <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
                  <Skeleton className="h-2.5 w-36 rounded dark:bg-muted" />
                </div>
              </div>
            </div>
          ) : (
            <DirectoryTableSkeleton rowCount={20} variant="global" columns={columns} />
          )}
        </div>
      </Card>
    </div>
  )
}

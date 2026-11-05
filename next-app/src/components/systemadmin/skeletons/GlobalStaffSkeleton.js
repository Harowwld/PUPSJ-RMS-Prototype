"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import DirectoryTableSkeleton from "@/components/systemadmin/skeletons/DirectoryTableSkeleton"

export default function GlobalStaffSkeleton({ columns }) {
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
        <div aria-hidden="true" className="flex items-center px-6 py-2.5 border-b border-border/80 dark:border-white/10 bg-gray-50/40 dark:bg-zinc-900/30 overflow-x-auto scrollbar-none">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08]">
            {["Active", "Archived"].map((label, index) => (
              <div key={label} className={`inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full ${index === 0 ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400"}`}>
                <span>{label}</span>
                <Skeleton className="h-3 w-5 rounded-full dark:bg-muted" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 overflow-hidden bg-gray-50/40 p-4 dark:bg-zinc-900/30 sm:px-5 sm:py-3">
          <div className="relative w-72 sm:w-80 shrink-0"><Skeleton className="h-9 w-full rounded-xl" /><Skeleton className="absolute right-2.5 top-1/2 h-3 w-6 -translate-y-1/2 rounded" /></div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {[72, 120, 126, 120].map((width, index) => <Skeleton key={index} style={{ width }} className="h-9 shrink-0 rounded-xl" />)}
          </div>
        </div>
        <div className="border-t border-border dark:border-border">
          <DirectoryTableSkeleton rowCount={20} variant="global" columns={columns} />
        </div>
      </Card>
    </div>
  )
}

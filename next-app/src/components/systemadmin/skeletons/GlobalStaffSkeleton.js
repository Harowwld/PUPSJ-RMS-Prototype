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
        <div aria-hidden="true" className="flex h-9 items-stretch overflow-x-auto border-b border-border px-6 scrollbar-none dark:border-white/10">
          {["Active", "Archived"].map((label, index) => <div key={label} className={`relative inline-flex items-center gap-2 px-3 text-xs font-semibold ${index === 0 ? "text-pup-maroon dark:text-red-400" : "text-gray-500 dark:text-zinc-400"}`}>{label}<Skeleton className="h-3 w-6 rounded dark:bg-muted" />{index === 0 && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-pup-maroon dark:bg-red-400" />}</div>)}
        </div>
        <div className="flex items-center justify-between gap-2 overflow-hidden bg-gray-50/40 p-4 dark:bg-zinc-900/30 sm:px-5 sm:py-3">
          <Skeleton className="h-9 w-[280px] shrink-0 rounded-xl" />
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

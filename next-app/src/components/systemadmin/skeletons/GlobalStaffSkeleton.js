"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import DirectoryTableSkeleton from "@/components/systemadmin/skeletons/DirectoryTableSkeleton"

export default function GlobalStaffSkeleton({ columns }) {
  return (
    <div className="flex w-full flex-[1_0_auto] flex-col font-jakarta animate-fade-up">
      <Card className="flex w-full flex-[1_0_auto] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-sm dark:bg-card dark:shadow-none">
        <PageHeader icon="UserSearch01Icon" title={<div className="flex flex-wrap items-baseline gap-3"><span>Global Personnel Directory</span><Skeleton className="h-3 w-36" /></div>} description="Manage system access, office assignments, and authorization settings for all administrators and records staff." showBorder={false} className="p-6" titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50" descriptionClassName="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300" />
        <div className="flex h-9 items-center gap-5 border-b border-border px-6"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-24" /></div>
        <div className="flex items-center gap-2 overflow-hidden bg-gray-50/40 p-4 dark:bg-zinc-900/30 sm:px-5 sm:py-3">
          <Skeleton className="h-9 w-[280px] shrink-0 rounded-xl" />
          {[72, 120, 126, 120].map((width, index) => <Skeleton key={index} style={{ width }} className="h-9 shrink-0 rounded-xl" />)}
          <div className="ml-auto flex gap-2"><Skeleton className="h-9 w-9 rounded-xl" /><Skeleton className="h-9 w-36 rounded-xl" /></div>
        </div>
        <DirectoryTableSkeleton rowCount={20} variant="global" columns={columns} />
      </Card>
    </div>
  )
}

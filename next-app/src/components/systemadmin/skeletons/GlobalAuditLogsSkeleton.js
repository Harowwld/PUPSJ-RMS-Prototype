"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import AuditLogsTableSkeleton from "@/components/systemadmin/skeletons/AuditLogsTableSkeleton"

export default function GlobalAuditLogsSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] min-w-0 flex-col gap-6 w-full animate-fade-up font-jakarta select-none">
      <Card className="flex flex-[1_0_auto] min-w-0 w-full flex-col gap-0 overflow-visible rounded-2xl border border-border bg-white p-0 shadow-sm dark:bg-card dark:shadow-none">
        <PageHeader
          icon="Shield01Icon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Platform Activity History</span>
              <Skeleton className="h-3.5 w-40 rounded dark:bg-muted" />
            </div>
          }
          description="Track every institutional action, approval, and system event across the platform."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex shrink-0 items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
            </div>
          }
        />
        <div aria-hidden="true" className="flex h-9 items-stretch overflow-x-auto border-b border-border px-6 scrollbar-none dark:border-white/10">
          {[["All Levels", true], ["Information", false], ["Warning", false], ["Critical", false]].map(([label, active]) => <div key={label} className={`relative inline-flex items-center px-3 text-xs font-semibold ${active ? "text-pup-maroon dark:text-red-400" : "text-gray-500 dark:text-zinc-400"}`}>{label}{active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-pup-maroon dark:bg-red-400" />}</div>)}
        </div>
        <div className="flex items-center justify-between gap-2 overflow-hidden bg-gray-50/40 p-4 dark:bg-zinc-900/30 sm:px-5 sm:py-3">
          <Skeleton className="h-9 w-64 shrink-0 rounded-xl" />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {["w-20", "w-28", "w-24", "w-32"].map((width, i) => <Skeleton key={i} className={`h-9 shrink-0 rounded-xl ${width}`} />)}
          </div>
        </div>
        <AuditLogsTableSkeleton rowCount={20} embedded showScope />
      </Card>
    </div>
  )
}

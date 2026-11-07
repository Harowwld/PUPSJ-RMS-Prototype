"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import AuditLogsTableSkeleton from "@/components/systemadmin/skeletons/AuditLogsTableSkeleton"

export default function GlobalAuditLogsSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] min-w-0 flex-col gap-6 w-full animate-fade-up font-jakarta select-none">
      <Card className="flex flex-[1_0_auto] min-w-0 w-full flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-sm dark:bg-card dark:shadow-none">
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
        <div aria-hidden="true" className="flex items-center px-6 py-2.5 border-b border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none">
          <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08]">
            {[["All Levels", true], ["Information", false], ["Warning", false], ["Critical", false]].map(([label, active]) => (
              <div key={label} className={`inline-flex items-center justify-center px-3.5 py-1 text-xs font-semibold rounded-full ${active ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400"}`}>
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 overflow-hidden bg-white p-4 dark:bg-card sm:px-5 sm:py-3">
          <div className="relative w-72 sm:w-80 shrink-0"><Skeleton className="h-9 w-full rounded-xl dark:bg-muted" /><Skeleton className="absolute right-2.5 top-1/2 h-3 w-6 -translate-y-1/2 rounded dark:bg-muted" /></div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {["w-20", "w-28", "w-24", "w-32"].map((width, i) => <Skeleton key={i} className={`h-9 shrink-0 rounded-xl ${width}`} />)}
          </div>
        </div>
        <AuditLogsTableSkeleton rowCount={50} embedded showScope />
      </Card>
    </div>
  )
}

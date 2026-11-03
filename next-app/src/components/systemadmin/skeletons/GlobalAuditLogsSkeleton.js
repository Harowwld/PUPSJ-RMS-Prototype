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
          title="Platform Activity History"
          description={<Skeleton className="mt-1 h-4 w-52" />}
          showBorder={false}
          className="px-6 py-5"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
        />
        <div aria-hidden="true" className="flex h-9 items-stretch gap-5 border-b border-border px-6 dark:border-white/10">
          {["w-20", "w-24", "w-16", "w-14"].map((width) => <div key={width} className="flex h-9 items-center px-3"><Skeleton className={`h-3 ${width}`} /></div>)}
        </div>
        <div className="flex items-center gap-2 overflow-hidden bg-gray-50/40 p-4 dark:bg-zinc-900/30 sm:px-5 sm:py-3">
          {["w-64", "w-20", "w-28", "w-24", "w-32", "w-28", "w-9", "w-24", "w-32"].map((width, i) => <Skeleton key={i} className={`h-9 shrink-0 rounded-xl ${width}`} />)}
        </div>
        <AuditLogsTableSkeleton rowCount={20} embedded showScope />
      </Card>
    </div>
  )
}

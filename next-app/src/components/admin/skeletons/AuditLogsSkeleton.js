"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import AuditLogsTableSkeleton from "@/components/systemadmin/skeletons/AuditLogsTableSkeleton"

export default function AuditLogsSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta select-none">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* Header */}
        <PageHeader
          icon="ph-shield-check"
          title="Activity History"
          description="Review staff actions, security events, and administrative changes."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-28 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-36 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        {/* 4 Top KPI Stat Cards */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/50 p-4 min-h-[95px] flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <Skeleton className="h-4 w-28 rounded dark:bg-muted" />
                  <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                </div>
                <div className="pt-2">
                  <Skeleton className="h-7 w-20 rounded dark:bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/40 dark:bg-zinc-900/30 flex-wrap">
          <Skeleton className="h-9 w-64 rounded-xl dark:bg-muted" />
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5">
              <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
            </div>
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-44 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Table Body & Pagination */}
        <div className="overflow-hidden rounded-b-2xl border-t border-border dark:border-border bg-white dark:bg-card flex flex-col flex-[1_0_auto]">
          <AuditLogsTableSkeleton rowCount={8} embedded={true} />
        </div>
      </Card>
    </div>
  )
}

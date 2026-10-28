"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import TransactionsTableSkeleton from "@/components/systemadmin/skeletons/TransactionsTableSkeleton"

export default function CampusOperationsSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta select-none">
      {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, & Table */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* Header */}
        <PageHeader
          icon="ph-bold ph-activity"
          title="Campus Services & Operations Monitor"
          description="Live tracking of student document requests and student organization proposals across campus departments."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        {/* 2 Top KPI Stat Cards */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/50 p-4 min-h-[110px] flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-44 rounded dark:bg-muted" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
                </div>
                <div className="flex justify-between items-end pt-2">
                  <div className="space-y-1.5">
                    <Skeleton className="h-7 w-16 rounded dark:bg-muted" />
                    <Skeleton className="h-3.5 w-48 rounded dark:bg-muted" />
                  </div>
                  <Skeleton className="h-5 w-5 rounded dark:bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          <Skeleton className="h-9 w-full sm:w-[280px] lg:w-[340px] rounded-xl dark:bg-muted" />
          <Skeleton className="h-9 w-36 rounded-xl dark:bg-muted" />
        </div>

        {/* Table Body & Pagination */}
        <div className="overflow-hidden rounded-b-2xl border-t border-border dark:border-border bg-white dark:bg-card flex flex-col flex-[1_0_auto]">
          <TransactionsTableSkeleton rowCount={8} />
        </div>
      </Card>
    </div>
  )
}

"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import BackupTableSkeleton from "@/components/admin/backup/BackupTableSkeleton"

export default function SystemBackupsSkeleton({ rowCount = 8 }) {
  return <div className="rms-brand-scope flex w-full flex-[1_0_auto] flex-col gap-6 font-jakarta" data-brand-accent="#000000" data-brand-foreground="#FFFFFF" style={{ "--brand-accent": "#000000", "--brand-foreground": "#FFFFFF" }}>
    <div className="relative flex min-h-[600px] w-full flex-[1_0_auto] items-stretch gap-5">
      <Card className="flex min-w-0 flex-1 flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-sm dark:bg-card dark:shadow-none">
        <PageHeader
          icon="Database01Icon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Platform Backups</span>
              <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
            </div>
          }
          description="Create and restore full system backups, manage scheduled snapshots, and sync to external hardware."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex shrink-0 items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
            </div>
          }
        />
        <div aria-hidden="true" className="flex h-9 items-stretch overflow-x-auto border-b border-border px-6 scrollbar-none dark:border-white/10"><div className="inline-flex items-center px-3"><Skeleton className="h-3 w-20" /></div><div className="inline-flex items-center px-3"><Skeleton className="h-3 w-24" /></div><div className="inline-flex items-center px-3"><Skeleton className="h-3 w-16" /></div></div>
        <div className="flex items-center justify-between gap-2 overflow-hidden bg-gray-50/40 px-5 py-3 dark:bg-zinc-900/30"><div className="relative w-72 sm:w-80 shrink-0"><Skeleton className="h-9 w-full rounded-xl" /><Skeleton className="absolute right-2.5 top-1/2 h-3 w-6 -translate-y-1/2 rounded" /></div><div className="ml-auto flex shrink-0 items-center gap-2">{[80, 120, 100, 110, 105].map((width, index) => <Skeleton key={index} style={{ width }} className="h-9 shrink-0 rounded-xl" />)}</div></div>
        <div className="flex items-center justify-between border-t border-border bg-gray-50/40 p-5 dark:bg-zinc-900/30"><Skeleton className="h-5 w-36" /><Skeleton className="h-9 w-28 rounded-xl" /></div>
        <BackupTableSkeleton embedded scope="platform" rowCount={rowCount} />
      </Card>
      <div className="hidden w-[350px] shrink-0 rounded-2xl border border-border bg-white p-6 xl:block dark:bg-card"><Skeleton className="h-5 w-32" /><div className="mt-5 space-y-4">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full rounded-xl" />)}</div></div>
    </div>
  </div>
}

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
        <div aria-hidden="true" className="flex items-center px-6 py-2.5 border-b border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none">
          <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08]">
            {["All Backups", "Full System", "Database Only"].map((label, index) => (
              <div key={label} className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full ${index === 0 ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400"}`}>
                <span>{label}</span>
                <Skeleton className="h-3 w-5 rounded-full dark:bg-muted" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 overflow-hidden bg-white px-5 py-3 dark:bg-card"><div className="relative w-72 sm:w-80 shrink-0"><Skeleton className="h-9 w-full rounded-xl" /><Skeleton className="absolute right-2.5 top-1/2 h-3 w-6 -translate-y-1/2 rounded" /></div><div className="ml-auto flex shrink-0 items-center gap-2">{[80, 120, 100, 110, 105].map((width, index) => <Skeleton key={index} style={{ width }} className="h-9 shrink-0 rounded-xl" />)}</div></div>
        <div className="flex items-center justify-between border-t border-border bg-white p-5 dark:bg-card"><Skeleton className="h-5 w-36" /><Skeleton className="h-9 w-28 rounded-xl" /></div>
        <BackupTableSkeleton embedded scope="platform" rowCount={rowCount} />
      </Card>
      <div className="hidden w-[350px] shrink-0 rounded-2xl border border-border bg-white p-6 xl:block dark:bg-card"><Skeleton className="h-5 w-32" /><div className="mt-5 space-y-4">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full rounded-xl" />)}</div></div>
    </div>
  </div>
}

"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import BackupTableSkeleton from "@/components/admin/backup/BackupTableSkeleton"

export default function SystemBackupsSkeleton({ rowCount = 8 }) {
  return <div className="rms-brand-scope flex w-full flex-[1_0_auto] flex-col gap-6 font-jakarta" data-brand-accent="#000000" data-brand-foreground="#FFFFFF" style={{ "--brand-accent": "#000000", "--brand-foreground": "#FFFFFF" }}>
    <div className="relative flex min-h-[600px] w-full flex-[1_0_auto] items-stretch gap-5">
      <Card className="flex min-w-0 flex-1 flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-sm dark:bg-card dark:shadow-none">
        <div className="p-6"><div className="flex flex-wrap items-baseline gap-3"><h2 className="text-[18px] font-semibold text-gray-900 dark:text-zinc-50">Platform Backups</h2><Skeleton className="h-3 w-20" /></div><p className="mt-2 text-[13px] text-gray-500 dark:text-zinc-400">Create and restore full system backups, manage scheduled snapshots, and sync to external hardware.</p></div>
        <div aria-hidden="true" className="flex h-9 items-stretch gap-5 border-b border-border px-6 dark:border-white/10"><Skeleton className="my-3 h-3 w-20" /><Skeleton className="my-3 h-3 w-24" /><Skeleton className="my-3 h-3 w-16" /></div>
        <div className="flex items-center gap-2 overflow-hidden bg-gray-50/40 px-5 py-3 dark:bg-zinc-900/30"><Skeleton className="h-9 w-64 shrink-0 rounded-xl" />{[80, 120, 100, 110, 105, 180, 36, 92, 112].map((width, index) => <Skeleton key={index} style={{ width }} className="h-9 shrink-0 rounded-xl" />)}</div>
        <div className="flex items-center justify-between border-t border-border bg-gray-50/40 p-5 dark:bg-zinc-900/30"><Skeleton className="h-5 w-36" /><Skeleton className="h-9 w-28 rounded-xl" /></div>
        <BackupTableSkeleton embedded scope="platform" rowCount={rowCount} />
      </Card>
      <div className="hidden w-80 shrink-0 rounded-2xl border border-border bg-white p-5 xl:block dark:bg-card"><Skeleton className="h-5 w-32" /><div className="mt-5 space-y-4">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full rounded-xl" />)}</div></div>
    </div>
  </div>
}

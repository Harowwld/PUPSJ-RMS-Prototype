"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import BackupTableSkeleton from "@/components/admin/backup/BackupTableSkeleton"

export default function SystemBackupsSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta select-none">
      <div className="flex flex-[1_0_auto] flex-col xl:flex-row gap-6 w-full items-start isolate">
        {/* Main Card */}
        <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate">
          {/* Header */}
          <PageHeader
            icon="ph-hard-drives"
            title="Platform Governance Backups"
            description="Create and restore full system governance backups, manage scheduled snapshots, and sync to external hardware."
            showBorder={false}
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
            actions={
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
                <Skeleton className="h-10 w-28 rounded-xl dark:bg-muted" />
                <Skeleton className="h-10 w-32 rounded-xl dark:bg-muted" />
                <Skeleton className="h-10 w-32 rounded-xl dark:bg-muted" />
              </div>
            }
          />

          {/* Auto Backup Schedule Skeleton Strip */}
          <div className="border-t border-border p-5 bg-gray-50/40 dark:bg-zinc-900/30 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-36 rounded-lg dark:bg-muted" />
              <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
            </div>
          </div>

          {/* Filter Toolbar Skeleton */}
          <div className="border-t border-border p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-card flex-wrap">
            <Skeleton className="h-9 w-64 rounded-xl dark:bg-muted" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
            </div>
          </div>

          {/* Table Body & Pagination */}
          <div className="flex-1 flex flex-col min-h-0 border-t border-border dark:border-border rounded-b-2xl overflow-hidden">
            <BackupTableSkeleton embedded={true} />
          </div>
        </Card>

        {/* Health Sidebar Skeleton */}
        <div className="w-full xl:w-80 shrink-0">
          <Card className="rounded-2xl border border-border bg-white dark:border-border dark:bg-card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28 rounded-lg dark:bg-muted" />
              <Skeleton className="h-6 w-16 rounded-full dark:bg-muted" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((k) => (
                <div key={k} className="p-3.5 rounded-xl border border-border/70 space-y-2 bg-gray-50/50 dark:bg-zinc-900/40">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
                    <Skeleton className="h-3.5 w-12 rounded dark:bg-muted" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full dark:bg-muted" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

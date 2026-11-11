"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import NotificationsListSkeleton from "@/components/staff/skeletons/NotificationsListSkeleton"

export default function NotificationsTabSkeleton() {
  return (
    <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up select-none">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* 1. Header */}
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-36 rounded" />
              <Skeleton className="h-3.5 w-72 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
        </div>

        {/* 2. Navigation Toolbar */}
        <div className="p-5 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-card">
          <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] shrink-0 select-none">
            <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs">
              <span>Unread</span>
              <Skeleton className="h-3 w-5 rounded-full dark:bg-muted" />
            </div>
            <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full text-gray-500 dark:text-zinc-400">
              <span>Read</span>
              <Skeleton className="h-3 w-5 rounded-full dark:bg-muted" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-60 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>

        {/* 3. Grouped Notifications List */}
        <div className="flex-[1_0_auto] flex flex-col border-t border-border dark:border-border">
          <NotificationsListSkeleton groupCount={2} itemsPerGroup={3} />
        </div>
      </Card>
    </div>
  )
}

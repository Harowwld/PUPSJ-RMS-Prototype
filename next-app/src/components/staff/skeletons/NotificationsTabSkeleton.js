"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import NotificationsListSkeleton from "@/components/staff/skeletons/NotificationsListSkeleton"

export default function NotificationsTabSkeleton() {
  return (
    <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up select-none">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
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
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        {/* 2. Navigation Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-wrap items-center justify-between gap-3 bg-gray-50/40 dark:bg-zinc-900/30">
          <div className="flex items-center gap-6">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-10 w-60 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
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

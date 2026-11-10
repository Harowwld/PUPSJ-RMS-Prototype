"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function RecordsArchiveSkeleton() {
  return (
    <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up select-none">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* 1. Header */}
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44 rounded" />
              <Skeleton className="h-3.5 w-72 rounded" />
            </div>
          </div>
          <Skeleton className="h-9 w-60 rounded-full" />
        </div>

        {/* 2. Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-card">
          <Skeleton className="h-9 w-44 rounded-full" />
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-72 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </div>

        {/* 3. Folder Cards Grid */}
        <div className="border-t border-border dark:border-border p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-white dark:bg-card flex-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-gray-50/50 p-6 dark:border-border dark:bg-zinc-900/40 flex flex-col justify-between min-h-[170px]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-3 w-36 rounded" />
                  </div>
                </div>
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border dark:border-border mt-4">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

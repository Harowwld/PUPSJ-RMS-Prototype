"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function KpiStatCardsSkeleton({ count = 3, className = "" }) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-4 items-stretch w-full",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="flex-1 min-w-[280px] overflow-hidden rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 p-4 shadow-none"
        >
          <div className="flex flex-col justify-between h-full gap-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
              <Skeleton className="h-4 w-4 rounded-full dark:bg-muted" />
            </div>
            <Skeleton className="h-7 w-20 rounded my-0.5 dark:bg-muted" />
            <Skeleton className="h-3.5 w-48 max-w-full rounded dark:bg-muted" />
          </div>
        </Card>
      ))}
    </div>
  )
}

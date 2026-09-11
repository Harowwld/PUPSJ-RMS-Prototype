"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function KpiStatCardsSkeleton({ count = 3, className = "" }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-2 items-start w-full",
        count === 2 ? "lg:grid-cols-2" : count === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm p-5 dark:border-white/10 dark:bg-card/60 backdrop-blur-xs"
        >
          <div className="flex flex-col justify-between h-full gap-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
              <Skeleton className="h-4 w-4 rounded-full dark:bg-muted" />
            </div>
            <Skeleton className="h-10 w-24 rounded my-1 dark:bg-muted" />
            <Skeleton className="h-3.5 w-48 max-w-full rounded dark:bg-muted" />
          </div>
        </Card>
      ))}
    </div>
  )
}

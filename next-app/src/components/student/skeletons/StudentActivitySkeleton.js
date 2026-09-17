"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function StudentActivityListSkeleton({ count = 5 }) {
  return (
    <div className="mt-5 space-y-3 select-none font-jakarta animate-fade-up">
      {Array.from({ length: count }).map((_, i) => (
        <article
          key={i}
          className="rounded-brand border border-gray-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-card"
        >
          <div className="flex items-center justify-between gap-3">
            <Skeleton
              className={cn(
                "h-4 rounded dark:bg-muted",
                i % 3 === 0 ? "w-52" : i % 2 === 0 ? "w-40" : "w-44"
              )}
            />
            <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
          </div>
          <Skeleton
            className={cn(
              "mt-2 h-3.5 rounded dark:bg-muted",
              i % 2 === 0 ? "w-3/4" : "w-1/2"
            )}
          />
        </article>
      ))}
    </div>
  )
}

export default function StudentActivitySkeleton({ count = 5 }) {
  return (
    <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card select-none font-jakarta animate-fade-up">
      <div className="space-y-1">
        <Skeleton className="h-5 w-32 rounded dark:bg-muted" />
        <Skeleton className="h-3.5 w-64 rounded dark:bg-muted" />
      </div>
      <StudentActivityListSkeleton count={count} />
    </section>
  )
}

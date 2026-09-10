"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function StudentOsasProposalsListSkeleton({ count = 3 }) {
  return (
    <div className="mt-5 space-y-3 select-none font-inter animate-fade-up">
      {Array.from({ length: count }).map((_, i) => (
        <article
          key={i}
          className="rounded-brand border border-gray-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Skeleton
              className={cn(
                "h-5 rounded dark:bg-muted",
                i % 3 === 0 ? "w-56" : i % 2 === 0 ? "w-64" : "w-48"
              )}
            />
            <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
            <span className="text-gray-300 dark:text-zinc-700">·</span>
            <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
          </div>
          <div className="mt-4 space-y-2.5 border-l-2 border-gray-200 pl-4 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
              <span className="text-gray-300 dark:text-zinc-700">—</span>
              <Skeleton className="h-3 w-48 rounded dark:bg-muted" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-16 rounded dark:bg-muted" />
              <span className="text-gray-300 dark:text-zinc-700">—</span>
              <Skeleton className="h-3 w-40 rounded dark:bg-muted" />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

export default function StudentOsasProposalsSkeleton({ count = 3 }) {
  return (
    <div className="space-y-6 select-none font-inter animate-fade-up">
      {/* Form Skeleton */}
      <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card">
        <div className="space-y-1">
          <Skeleton className="h-5 w-48 rounded dark:bg-muted" />
          <Skeleton className="h-3.5 w-64 rounded dark:bg-muted" />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
            <Skeleton className="h-10 w-full rounded-brand dark:bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
            <Skeleton className="h-10 w-full rounded-brand dark:bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
            <Skeleton className="h-10 w-full rounded-brand dark:bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
            <Skeleton className="h-10 w-full rounded-brand dark:bg-muted" />
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-10 w-32 rounded-brand dark:bg-muted" />
          </div>
        </div>
      </section>

      {/* History Skeleton */}
      <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-40 rounded dark:bg-muted" />
            <Skeleton className="h-3.5 w-72 rounded dark:bg-muted" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full dark:bg-muted" />
        </div>
        <StudentOsasProposalsListSkeleton count={count} />
      </section>
    </div>
  )
}

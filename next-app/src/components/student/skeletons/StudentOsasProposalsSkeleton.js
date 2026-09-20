"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StudentOsasProposalsListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3 select-none font-jakarta animate-in fade-in duration-200">
      {Array.from({ length: count }).map((_, i) => (
        <article
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Skeleton
              className={cn(
                "h-4.5 rounded dark:bg-muted",
                i % 3 === 0 ? "w-56" : i % 2 === 0 ? "w-64" : "w-48"
              )}
            />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
              <Skeleton className="h-7 w-7 rounded-[6px] dark:bg-muted" />
              <Skeleton className="h-7 w-7 rounded-[6px] dark:bg-muted" />
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
            <span className="text-gray-300 dark:text-zinc-700">·</span>
            <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
          </div>
          <div className="mt-3 space-y-2 border-l-2 border-gray-200 pl-4 dark:border-white/10">
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

export default function StudentOsasProposalsSkeleton({ count = 3, showForm = true }) {
  return (
    <div className="flex flex-col w-full flex-1 min-h-0 animate-in fade-in duration-200 select-none font-jakarta">
      {/* ONE Single Card Container encapsulating Header, Inline Proposal Form, Toolbar & Proposals List */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate mb-4 min-h-0 flex-1">
        {/* 1. Page Header Skeleton */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44 rounded dark:bg-muted" />
              <Skeleton className="h-3.5 w-72 sm:w-96 rounded dark:bg-muted" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="hidden sm:inline-block h-6 w-32 rounded-full dark:bg-muted" />
            <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
            <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />
            <Skeleton className="h-10 w-28 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* 2. Inline Proposal Form Skeleton */}
        {showForm && (
          <div className="border-t border-gray-100 dark:border-white/10 p-5 sm:p-6 bg-gray-50/40 dark:bg-zinc-900/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40 rounded dark:bg-muted" />
                  <Skeleton className="h-3 w-64 rounded dark:bg-muted" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Skeleton className="h-10 w-36 rounded-xl dark:bg-muted" />
            </div>
          </div>
        )}

        {/* 3. History Header Skeleton */}
        <div className="border-t border-gray-100 dark:border-white/10 p-5 flex items-center justify-between bg-white dark:bg-card">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-36 rounded dark:bg-muted" />
            <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* 4. Proposals List Skeleton */}
        <div className="border-t border-gray-100 dark:border-white/10 flex-1 p-5">
          <StudentOsasProposalsListSkeleton count={count} />
        </div>
      </Card>
    </div>
  )
}

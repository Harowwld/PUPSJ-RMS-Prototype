"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function RegistrarODRSSkeleton() {
  return (
    <div className="flex flex-col h-full gap-4 animate-fade-up font-inter select-none">
      {/* Top Header Card Skeleton */}
      <Card className="rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-52 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-72 rounded dark:bg-muted" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 rounded-lg dark:bg-muted" />
      </Card>

      {/* 2-Column Split: Queue & Ticket Details Inspector */}
      <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_360px]">
        {/* Left: Request Queue */}
        <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5 mb-4">
            <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
            <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
          </div>

          <div className="space-y-2.5 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-full rounded-brand border border-gray-200 dark:border-zinc-800 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
                  <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                  <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
                  <Skeleton className="h-4 w-14 rounded-full dark:bg-muted" />
                </div>
                {i % 2 === 0 && (
                  <Skeleton className="h-7 w-full rounded dark:bg-muted/70" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Right: Inspector Aside */}
        <aside className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-gray-100 dark:border-white/5 mb-4 space-y-2">
              <Skeleton className="h-2.5 w-24 rounded dark:bg-muted" />
              <Skeleton className="h-5 w-48 rounded dark:bg-muted" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-32 rounded dark:bg-muted" />
                <Skeleton className="h-4 w-14 rounded-full dark:bg-muted" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-lg dark:bg-muted" />
              </div>

              <div className="space-y-1.5">
                <Skeleton className="h-3 w-40 rounded dark:bg-muted" />
                <Skeleton className="h-28 w-full rounded-lg dark:bg-muted" />
              </div>
            </div>
          </div>

          <Skeleton className="h-10 w-full rounded-lg dark:bg-muted mt-4" />
        </aside>
      </div>
    </div>
  )
}

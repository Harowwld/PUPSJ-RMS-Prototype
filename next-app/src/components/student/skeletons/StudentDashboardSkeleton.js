"use client"

import { Skeleton } from "@/components/ui/skeleton"
import StudentRequestsTableSkeleton from "./StudentRequestsTableSkeleton"

export default function StudentDashboardSkeleton() {
  return (
    <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-red-50/20 font-inter dark:bg-red-950/10 select-none">
      {/* Shared dashboard liquid-gradient background */}
      <div className="liquid-container pointer-events-none">
        <div className="liquid-blob liquid-blob-1" />
        <div className="liquid-blob liquid-blob-2" />
        <div className="liquid-blob liquid-blob-3" />
      </div>

      {/* Header Bar Skeleton */}
      <header className="relative z-20 flex h-16 w-full shrink-0 items-center justify-between border-b border-gray-200/80 bg-white/80 px-4 sm:px-6 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/80">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
          <Skeleton className="h-5 w-24 rounded dark:bg-muted" />
          <span className="hidden sm:inline-block h-4 w-[1px] bg-gray-200 dark:bg-zinc-800" />
          <Skeleton className="hidden sm:inline-block h-6 w-32 rounded-full dark:bg-muted" />
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="hidden md:block h-9 w-52 rounded-brand dark:bg-muted" />
          <Skeleton className="h-9 w-9 rounded-full dark:bg-muted" />
        </div>
      </header>

      {/* Main Body with Sidebar + Main Workspace */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar Skeleton */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between border-r border-gray-200/80 bg-white/60 p-4 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/60">
          <div className="space-y-4">
            {/* Header label */}
            <div className="px-2 pt-2">
              <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
            </div>

            {/* Navigation Items */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 rounded-brand bg-red-50/60 dark:bg-red-950/30 p-2.5">
                <Skeleton className="h-5 w-5 rounded dark:bg-muted" />
                <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
              </div>
              <div className="flex items-center gap-3 rounded-brand p-2.5">
                <Skeleton className="h-5 w-5 rounded dark:bg-muted" />
                <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
              </div>
            </div>
          </div>

          {/* Bottom logout area */}
          <div className="border-t border-gray-100 dark:border-white/10 pt-3">
            <div className="flex items-center gap-3 p-2">
              <Skeleton className="h-5 w-5 rounded dark:bg-muted" />
              <Skeleton className="h-4 w-20 rounded dark:bg-muted" />
            </div>
          </div>
        </aside>

        {/* Main Content Skeleton Area */}
        <main className="relative w-full min-w-0 min-h-0 flex-1 overflow-y-auto bg-red-50/10 dark:bg-red-950/10 backdrop-blur-xs">
          <div className="flex min-h-0 w-full flex-1 flex-col p-4 sm:p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              {/* Page Header Card Skeleton */}
              <div className="rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-44 rounded dark:bg-muted" />
                    <Skeleton className="h-3.5 w-72 sm:w-96 rounded dark:bg-muted" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-32 rounded-full dark:bg-muted" />
                  <Skeleton className="h-9 w-9 rounded-lg dark:bg-muted" />
                </div>
              </div>

              {/* Card 1: New Document Request Form Skeleton */}
              <div className="rounded-brand border border-gray-200 bg-white p-5 sm:p-6 shadow-sm dark:border-white/10 dark:bg-card flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-44 rounded dark:bg-muted" />
                      <Skeleton className="h-3 w-64 rounded dark:bg-muted" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-72 sm:w-80 rounded-lg dark:bg-muted" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-brand dark:bg-muted" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-brand dark:bg-muted" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-brand dark:bg-muted" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
                  <Skeleton className="h-20 w-full rounded-brand dark:bg-muted" />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <Skeleton className="h-3 w-64 rounded dark:bg-muted" />
                  <Skeleton className="h-10 w-36 rounded-brand dark:bg-muted" />
                </div>
              </div>

              {/* Card 2: Request History & Table Skeleton */}
              <StudentRequestsTableSkeleton rowCount={6} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

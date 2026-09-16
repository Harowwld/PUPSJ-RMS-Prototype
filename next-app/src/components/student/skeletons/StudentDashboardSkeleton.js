"use client"

import { Skeleton } from "@/components/ui/skeleton"
import StudentRequestsTableSkeleton from "./StudentRequestsTableSkeleton"
import StudentOsasProposalsSkeleton from "./StudentOsasProposalsSkeleton"
import StudentComplianceSkeleton from "./StudentComplianceSkeleton"

export default function StudentDashboardSkeleton({ view = "odrs" }) {
  return (
    <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-slate-50/30 font-inter dark:bg-zinc-950/30 select-none">
      {/* Shared dashboard liquid-gradient background */}
      <div className="liquid-container pointer-events-none opacity-20 dark:opacity-10">
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
              <div className="flex items-center gap-3 rounded-xl bg-gray-100/80 dark:bg-zinc-800/60 p-2.5">
                <Skeleton className="h-5 w-5 rounded dark:bg-muted" />
                <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
              </div>
              <div className="flex items-center gap-3 rounded-xl p-2.5">
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
        <main className="relative w-full min-w-0 min-h-0 flex-1 overflow-y-auto bg-white/25 dark:bg-zinc-950/25 backdrop-blur-xs">
          <div className="flex min-h-0 w-full flex-1 flex-col p-4">
            {view === "osas" ? (
              <StudentOsasProposalsSkeleton />
            ) : view === "compliance" ? (
              <StudentComplianceSkeleton />
            ) : (
              <StudentRequestsTableSkeleton />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

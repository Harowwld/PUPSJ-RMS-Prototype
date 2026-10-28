"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StudentRequestsTableRowsSkeleton({ rowCount = 6 }) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => (
        <tr
          key={i}
          className="h-[52px] border-b border-border dark:border-border last:border-b-0"
        >
          {/* Ticket # */}
          <td className="p-4 pl-6 align-middle border-r border-border/70 dark:border-border/70">
            <Skeleton className="h-4 w-12 rounded dark:bg-muted font-mono" />
          </td>

          {/* Document Type */}
          <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
            <Skeleton
              className={cn(
                "h-4 rounded dark:bg-muted",
                i % 3 === 0 ? "w-48" : i % 2 === 0 ? "w-36" : "w-40"
              )}
            />
          </td>

          {/* Purpose / Description */}
          <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
            <Skeleton
              className={cn(
                "h-4 rounded dark:bg-muted",
                i % 4 === 0 ? "w-56" : i % 3 === 0 ? "w-44" : i % 2 === 0 ? "w-60" : "w-36"
              )}
            />
          </td>

          {/* Status */}
          <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
            <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
          </td>

          {/* Date Requested */}
          <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
            <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
          </td>

          {/* Action */}
          <td className="p-4 pr-6 align-middle text-right">
            <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted ml-auto" />
          </td>
        </tr>
      ))}
    </>
  )
}

export function StudentRequestsPaginationSkeleton() {
  return (
    <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl mt-auto select-none">
      <div className="flex items-center gap-6 text-xs text-gray-900 dark:text-zinc-300">
        <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-10 rounded dark:bg-muted" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-5 w-6 rounded dark:bg-muted" />
            <Skeleton className="h-5 w-6 rounded dark:bg-muted" />
            <Skeleton className="h-5 w-6 rounded dark:bg-muted" />
            <Skeleton className="h-5 w-6 rounded dark:bg-muted" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-12 rounded-xl dark:bg-muted" />
        <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
        <Skeleton className="h-8 w-12 rounded-xl dark:bg-muted" />
      </div>
    </div>
  )
}

export default function StudentRequestsTableSkeleton({ rowCount = 6, showForm = true }) {
  return (
    <div className="flex flex-col w-full flex-[1_0_auto] animate-in fade-in duration-200 select-none font-jakarta">
      {/* ONE Single Card Container encapsulating Header, Inline Request Form, Toolbar, Table & Pagination */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate">
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
            
            <Skeleton className="h-10 w-28 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* 2. Inline Non-Modal Request Form Skeleton */}
        {showForm && (
          <div className="border-t border-border dark:border-border p-5 sm:p-6 bg-gray-50/40 dark:bg-zinc-900/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border dark:border-border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-44 rounded dark:bg-muted" />
                  <Skeleton className="h-3 w-64 rounded dark:bg-muted" />
                </div>
              </div>
              <Skeleton className="h-8 w-72 sm:w-80 rounded-xl dark:bg-muted" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
              <Skeleton className="h-20 w-full rounded-xl dark:bg-muted" />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
              <Skeleton className="h-3 w-64 rounded dark:bg-muted" />
              <Skeleton className="h-10 w-36 rounded-xl dark:bg-muted" />
            </div>
          </div>
        )}

        {/* 3. Toolbar & Controls Header Skeleton */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-card">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-36 rounded dark:bg-muted" />
            <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <Skeleton className="h-10 w-full sm:w-64 lg:w-72 rounded-xl dark:bg-muted" />
            <Skeleton className="h-10 w-full sm:w-40 rounded-xl dark:bg-muted shrink-0" />
          </div>
        </div>

        {/* 4. Main Table Skeleton */}
        <div className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 motion-safe:animate-in motion-safe:fade-in-50 duration-200 ease-out select-none">
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
              <tr className="text-left text-[11px] font-semibold tracking-wider text-gray-500 dark:text-zinc-400 uppercase select-none">
                <th className="p-4 pl-6 w-[10%] min-w-[90px] whitespace-nowrap border-r border-border/80 dark:border-border">
                  <Skeleton className="h-3.5 w-16 rounded dark:bg-muted" />
                </th>
                <th className="p-4 w-[22%] min-w-[200px] whitespace-nowrap border-r border-border/80 dark:border-border">
                  <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                </th>
                <th className="p-4 w-[32%] min-w-[240px] whitespace-nowrap border-r border-border/80 dark:border-border">
                  <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
                </th>
                <th className="p-4 w-[14%] min-w-[130px] whitespace-nowrap border-r border-border/80 dark:border-border">
                  <Skeleton className="h-3.5 w-16 rounded dark:bg-muted" />
                </th>
                <th className="p-4 w-[14%] min-w-[150px] whitespace-nowrap border-r border-border/80 dark:border-border">
                  <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                </th>
                <th className="p-4 pr-6 text-right w-[8%] min-w-[90px] whitespace-nowrap">
                  <Skeleton className="h-3.5 w-12 rounded dark:bg-muted ml-auto" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent">
              <StudentRequestsTableRowsSkeleton rowCount={rowCount} />
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Bar Skeleton */}
        <StudentRequestsPaginationSkeleton />
      </Card>
    </div>
  )
}

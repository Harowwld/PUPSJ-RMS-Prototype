"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function StudentRequestsTableRowsSkeleton({ rowCount = 6 }) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => (
        <tr
          key={i}
          className="h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0"
        >
          {/* Ticket # */}
          <td className="py-0 px-4 pl-6 align-middle">
            <Skeleton className="h-4 w-12 rounded dark:bg-muted font-mono" />
          </td>

          {/* Document Type */}
          <td className="py-0 px-4 align-middle">
            <Skeleton
              className={cn(
                "h-4 rounded dark:bg-muted",
                i % 3 === 0 ? "w-48" : i % 2 === 0 ? "w-36" : "w-40"
              )}
            />
          </td>

          {/* Client */}
          <td className="py-0 px-4 align-middle">
            <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
          </td>

          {/* Purpose / Description */}
          <td className="py-0 px-4 align-middle max-w-[280px]">
            <Skeleton
              className={cn(
                "h-4 rounded dark:bg-muted",
                i % 4 === 0 ? "w-56" : i % 3 === 0 ? "w-44" : i % 2 === 0 ? "w-60" : "w-36"
              )}
            />
          </td>

          {/* Status */}
          <td className="py-0 px-4 align-middle">
            <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
          </td>

          {/* Date Requested */}
          <td className="py-0 px-4 align-middle whitespace-nowrap">
            <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
          </td>

          {/* Action */}
          <td className="py-0 px-4 pr-6 align-middle text-right">
            <Skeleton className="h-7 w-7 rounded-[6px] dark:bg-muted ml-auto" />
          </td>
        </tr>
      ))}
    </>
  )
}

export function StudentRequestsPaginationSkeleton() {
  return (
    <div className="flex items-center justify-between border-t border-gray-100 bg-white p-4 sm:p-6 px-6 sm:px-8 dark:border-white/10 dark:bg-card mt-auto select-none">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
          <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 dark:border-white/10">
            <Skeleton className="h-3.5 w-10 rounded dark:bg-muted" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-5 w-6 rounded dark:bg-muted" />
              <Skeleton className="h-5 w-6 rounded dark:bg-muted" />
              <Skeleton className="h-5 w-6 rounded dark:bg-muted" />
              <Skeleton className="h-5 w-6 rounded dark:bg-muted" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Skeleton className="h-4 w-8 rounded dark:bg-muted" />
        <Skeleton className="h-8 w-8 rounded-[6px] dark:bg-muted" />
        <Skeleton className="h-4 w-8 rounded dark:bg-muted" />
      </div>
    </div>
  )
}

export default function StudentRequestsTableSkeleton({ rowCount = 6 }) {
  return (
    <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card flex flex-col font-inter select-none">
      {/* Header & Toolbar */}
      <div className="border-b border-gray-100 dark:border-white/10 p-5 sm:p-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <Skeleton className="h-5 w-36 rounded dark:bg-muted" />
            <Skeleton className="h-3.5 w-72 rounded dark:bg-muted" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full dark:bg-muted" />
        </div>

        {/* Toolbar Row: Search + Status Filter */}
        <div className="mt-4 flex flex-row items-center gap-[12px] w-full">
          <Skeleton className="h-[36px] flex-1 rounded-[8px] dark:bg-muted" />
          <Skeleton className="h-[36px] w-[160px] rounded-[8px] dark:bg-muted shrink-0" />
        </div>
      </div>

      {/* Main Table */}
      <div className="w-full overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
            <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500 h-11">
              <th className="w-24 p-4 pl-6">
                <Skeleton className="h-3.5 w-14 rounded dark:bg-muted" />
              </th>
              <th className="p-4 min-w-[220px]">
                <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
              </th>
              <th className="w-32 p-4">
                <Skeleton className="h-3.5 w-16 rounded dark:bg-muted" />
              </th>
              <th className="p-4 min-w-[240px]">
                <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
              </th>
              <th className="w-36 p-4">
                <Skeleton className="h-3.5 w-16 rounded dark:bg-muted" />
              </th>
              <th className="w-44 p-4">
                <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
              </th>
              <th className="w-28 p-4 pr-6 text-right">
                <Skeleton className="h-3.5 w-12 rounded dark:bg-muted ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="bg-transparent">
            <StudentRequestsTableRowsSkeleton rowCount={rowCount} />
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <StudentRequestsPaginationSkeleton />
    </div>
  )
}

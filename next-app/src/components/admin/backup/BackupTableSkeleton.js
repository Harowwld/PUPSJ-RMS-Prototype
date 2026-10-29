"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function BackupTableSkeleton({ rowCount = 8, embedded = false, className = "" }) {
  return (
    <div
      className={cn(
        "w-full flex flex-[1_0_auto] flex-col overflow-hidden isolate",
        embedded
          ? "rounded-b-2xl"
          : "rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card",
        className
      )}
    >
      <div className="w-full flex-[1_0_auto] overflow-x-auto select-none show-scrollbar pb-2">
        <table className="w-full text-sm border-collapse min-w-[1050px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
              <th className="w-12 py-3 px-4 text-center align-middle border-r border-border/80 dark:border-border sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90">
                <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[36%] border-r border-border/80 dark:border-border sticky left-12 z-20 bg-gray-50/90 dark:bg-zinc-900/90">
                <Skeleton className="h-3.5 w-28 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[14%] text-center">
                <Skeleton className="h-3.5 w-12 mx-auto dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[18%]">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[22%] text-center">
                <Skeleton className="h-3.5 w-16 mx-auto dark:bg-muted" />
              </th>
              <th className="py-3 px-4 pr-6 w-28 text-right">
                <Skeleton className="h-3.5 w-14 ml-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="h-[52px] border-b border-border dark:border-border last:border-b-0"
              >
                <td className="py-3 px-4 align-middle text-center border-r border-border/70 dark:border-border/70 sticky left-0 z-10 bg-white dark:bg-card">
                  <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
                </td>
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70 sticky left-12 z-10 bg-white dark:bg-card">
                  <div className="flex items-center gap-3">
                    <Skeleton
                      className={cn(
                        "h-4 rounded dark:bg-muted",
                        i % 3 === 0 ? "w-52" : i % 2 === 0 ? "w-64" : "w-44"
                      )}
                    />
                  </div>
                </td>
                <td className="py-3 px-4 align-middle text-center">
                  <Skeleton className="h-4 w-14 mx-auto rounded dark:bg-muted" />
                </td>
                <td className="py-3 px-4 align-middle">
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                    <Skeleton className="h-2.5 w-16 rounded dark:bg-muted" />
                  </div>
                </td>
                <td className="py-3 px-4 align-middle text-center">
                  <Skeleton className="h-[22px] w-14 rounded-full mx-auto dark:bg-muted" />
                </td>
                <td className="py-3 px-4 pr-6 align-middle text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                    <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Skeleton */}
      <div className="mt-auto flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl">
        <div className="flex items-center gap-6">
          <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-8 rounded dark:bg-muted" />
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-6 w-7 rounded-lg dark:bg-muted" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-12 rounded-xl dark:bg-muted" />
          <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
          <Skeleton className="h-8 w-12 rounded-xl dark:bg-muted" />
        </div>
      </div>
    </div>
  )
}

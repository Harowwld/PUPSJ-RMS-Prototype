"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function AuditLogsTableSkeleton({ rowCount = 8, embedded = false, showScope = false }) {
  return (
    <div
      className={cn(
        "overflow-hidden isolate flex flex-col flex-1 rounded-b-2xl",
        embedded
          ? "border-t border-border dark:border-border"
          : "rounded-2xl border border-border dark:border-border bg-white dark:bg-card shadow-sm"
      )}
    >
      <div className="flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2">
        <table className={cn("w-full text-sm border-separate border-spacing-0", showScope ? "min-w-[1240px]" : "min-w-[1240px]")}>
          <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
              <th className="w-12 min-w-12 max-w-12 py-3 px-2.5 text-center">
                <Skeleton className="h-3.5 w-3.5 rounded mx-auto dark:bg-muted" />
              </th>
              <th className={cn("py-3 px-4", showScope ? "w-[15%]" : "w-[16%]")}>
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className={cn("py-3 px-4", showScope ? "w-[9%]" : "w-[10%]")}>
                <Skeleton className="h-3.5 w-14 dark:bg-muted" />
              </th>
              <th className={cn("py-3 px-4", showScope ? "w-[18%]" : "w-[20%]")}>
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              {showScope && (
                <th className="py-3 px-4 w-[12%]">
                  <Skeleton className="h-3.5 w-16 dark:bg-muted" />
                </th>
              )}
              <th className={cn("py-3 px-4", showScope ? "w-[16%]" : "w-[18%]")}>
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              <th className={cn("py-3 px-4", showScope ? "w-[22%] max-w-[280px]" : "w-[24%] max-w-[280px]")}>
                <Skeleton className="h-3.5 w-28 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 pr-6 text-right w-20">
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
                <td className="w-12 min-w-12 max-w-12 py-3 px-2.5 align-middle text-center border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-3.5 w-3.5 rounded mx-auto dark:bg-muted" />
                </td>
                <td className="py-3 px-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3.5 w-24 font-mono rounded dark:bg-muted" />
                  </div>
                </td>
                <td className="py-3 px-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
                </td>
                <td className="py-3 px-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                </td>
                {showScope && (
                  <td className="py-3 px-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
                  </td>
                )}
                <td className="py-3 px-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
                </td>
                <td className="py-3 px-4 align-middle overflow-hidden max-w-[280px] border-r border-border/70 dark:border-border/70">
                  <Skeleton
                    className={cn(
                      "h-3.5 rounded dark:bg-muted",
                      i % 2 === 0 ? "w-36" : "w-44"
                    )}
                  />
                </td>
                <td className="py-3 px-4 pr-6 align-middle text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
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
          <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
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

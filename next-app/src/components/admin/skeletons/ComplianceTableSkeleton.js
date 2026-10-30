"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function ComplianceTableSkeleton({ rowCount = 6, embedded = false }) {
  return (
    <div
      className={cn(
        "overflow-hidden flex flex-col flex-1 isolate select-none",
        embedded
          ? "border-t border-border dark:border-border rounded-b-2xl"
          : "rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card"
      )}
    >
      {/* Table Toolbar Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-border dark:border-border bg-gray-50/40 dark:bg-zinc-900/30">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
          <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
        </div>
      </div>

      <div className="flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2">
        <table className="w-full text-sm border-collapse min-w-[850px]">
          <thead className="sticky top-0 z-10 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs border-b border-border select-none">
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
              <th className="py-3 px-6 w-[32%] sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="py-3 px-6 w-[22%] text-center">
                <Skeleton className="h-3.5 w-24 mx-auto dark:bg-muted" />
              </th>
              <th className="py-3 px-6 w-[22%] text-center">
                <Skeleton className="h-3.5 w-24 mx-auto dark:bg-muted" />
              </th>
              <th className="py-3 px-6 w-[24%] text-right">
                <Skeleton className="h-3.5 w-24 ml-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="h-[54px] border-b border-border dark:border-border last:border-b-0"
              >
                {/* Program */}
                <td className="py-3 px-6 align-middle border-r border-border/70 dark:border-border/70 sticky left-0 z-10 bg-white dark:bg-card">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-16 rounded-md dark:bg-muted shrink-0" />
                    <Skeleton
                      className={cn(
                        "h-3.5 rounded dark:bg-muted",
                        i % 2 === 0 ? "w-48" : "w-60"
                      )}
                    />
                  </div>
                </td>

                {/* Total Students */}
                <td className="py-3 px-6 align-middle text-center border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-4 w-12 mx-auto rounded dark:bg-muted font-mono" />
                </td>

                {/* Fully Digitized */}
                <td className="py-3 px-6 align-middle text-center border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-4 w-12 mx-auto rounded dark:bg-muted font-mono" />
                </td>

                {/* Completeness */}
                <td className="py-3 px-6 align-middle text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Skeleton className="h-4 w-10 rounded dark:bg-muted" />
                    <div className="h-2 w-24 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                      <Skeleton
                        className={cn(
                          "h-full rounded-full dark:bg-muted",
                          i % 3 === 0 ? "w-4/5" : i % 2 === 0 ? "w-3/5" : "w-1/2"
                        )}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

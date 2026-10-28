"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function RecordsReviewTableSkeleton({ rowCount = 8, embedded = false }) {
  return (
    <div
      className={cn(
        "overflow-hidden flex flex-col flex-1 isolate select-none",
        embedded
          ? "border-t border-border dark:border-border rounded-b-2xl"
          : "rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card"
      )}
    >
      <div className="flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2">
        <table className="w-full text-sm border-collapse min-w-[1240px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
            <tr className="text-left text-[11px] font-semibold tracking-wider text-gray-500 dark:text-zinc-400 select-none">
              <th className="w-12 py-3 px-4 text-center border-r border-border/80 dark:border-border">
                <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[160px] min-w-[160px] border-r border-border/80 dark:border-border">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[220px] min-w-[220px] border-r border-border/80 dark:border-border">
                <Skeleton className="h-3.5 w-28 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[180px] min-w-[180px] border-r border-border/80 dark:border-border">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[220px] min-w-[220px] border-r border-border/80 dark:border-border">
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[130px] min-w-[130px] text-center border-r border-border/80 dark:border-border">
                <Skeleton className="h-3.5 w-16 mx-auto dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[150px] min-w-[150px] border-r border-border/80 dark:border-border">
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              <th className="w-28 min-w-[110px] py-3 px-4 pr-6 text-right">
                <Skeleton className="h-3.5 w-14 ml-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="border-b border-border dark:border-border last:border-b-0"
              >
                {/* Checkbox */}
                <td className="w-12 py-3 px-4 text-center border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
                </td>

                {/* Student No */}
                <td className="py-3 px-4 w-[160px] min-w-[160px] whitespace-nowrap border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-6 w-28 rounded-full dark:bg-muted" />
                </td>

                {/* Student Name */}
                <td className="py-3 px-4 w-[220px] min-w-[220px] border-r border-border/70 dark:border-border/70">
                  <Skeleton
                    className={cn(
                      "h-4 rounded dark:bg-muted",
                      i % 3 === 0 ? "w-36" : i % 2 === 0 ? "w-44" : "w-32"
                    )}
                  />
                </td>

                {/* Document Type */}
                <td className="py-3 px-4 w-[180px] min-w-[180px] border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-6 w-24 rounded-full dark:bg-muted" />
                </td>

                {/* Filename */}
                <td className="py-3 px-4 w-[220px] min-w-[220px] border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
                </td>

                {/* Status */}
                <td className="py-3 px-4 w-[130px] min-w-[130px] text-center border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-6 w-20 rounded-full mx-auto dark:bg-muted" />
                </td>

                {/* Upload Date */}
                <td className="py-3 px-4 w-[150px] min-w-[150px] border-r border-border/70 dark:border-border/70">
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
                    <Skeleton className="h-2.5 w-14 rounded dark:bg-muted" />
                  </div>
                </td>

                {/* Actions */}
                <td className="w-28 min-w-[110px] py-3 px-4 pr-6 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                    <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                    <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-card p-4 px-6 mt-auto rounded-b-2xl"
      >
        <Skeleton className="h-3.5 w-40 rounded dark:bg-muted" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-xl dark:bg-muted" />
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((p) => (
              <Skeleton key={p} className="h-7 w-7 rounded-lg dark:bg-muted" />
            ))}
          </div>
          <Skeleton className="h-8 w-16 rounded-xl dark:bg-muted" />
        </div>
      </div>
    </div>
  )
}

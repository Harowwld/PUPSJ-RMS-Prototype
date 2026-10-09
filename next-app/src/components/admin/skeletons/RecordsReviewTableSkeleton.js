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
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-white dark:bg-card dark:border-border">
            <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">
              <th className="w-12 p-4 text-center">
                <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
              </th>
              <th className="w-44 p-4">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="p-4 min-w-[200px] max-w-[260px]">
                <Skeleton className="h-3.5 w-28 dark:bg-muted" />
              </th>
              <th className="p-4 min-w-[160px]">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="p-4 min-w-[180px] max-w-[240px]">
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              <th className="w-32 p-4 text-center">
                <Skeleton className="h-3.5 w-16 mx-auto dark:bg-muted" />
              </th>
              <th className="w-36 p-4">
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              <th className="w-28 p-4 text-right">
                <Skeleton className="h-3.5 w-14 ml-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="border-b-[0.5px] border-border dark:border-border last:border-b-0"
              >
                {/* Checkbox */}
                <td className="w-12 p-4 text-center">
                  <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
                </td>

                {/* Student No */}
                <td className="w-44 p-4 whitespace-nowrap">
                  <Skeleton className="h-6 w-28 rounded-full dark:bg-muted" />
                </td>

                {/* Student Name */}
                <td className="p-4 min-w-[200px] max-w-[260px]">
                  <Skeleton
                    className={cn(
                      "h-4 rounded dark:bg-muted",
                      i % 3 === 0 ? "w-36" : i % 2 === 0 ? "w-44" : "w-32"
                    )}
                  />
                </td>

                {/* Document Type */}
                <td className="p-4 min-w-[160px]">
                  <Skeleton className="h-6 w-24 rounded-full dark:bg-muted" />
                </td>

                {/* Filename */}
                <td className="p-4 min-w-[180px] max-w-[240px]">
                  <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
                </td>

                {/* Status */}
                <td className="w-32 p-4 text-center">
                  <Skeleton className="h-6 w-20 rounded-full mx-auto dark:bg-muted" />
                </td>

                {/* Upload Date */}
                <td className="w-36 p-4">
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
                    <Skeleton className="h-2.5 w-14 rounded dark:bg-muted" />
                  </div>
                </td>

                {/* Actions */}
                <td className="w-28 p-4 text-right">
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

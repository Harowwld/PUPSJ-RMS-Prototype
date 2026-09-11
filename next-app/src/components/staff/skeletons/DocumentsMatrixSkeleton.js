"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function DocumentsMatrixSkeleton({ rowCount = 7, embedded = false }) {
  return (
    <div
      className={cn(
        "flex flex-col flex-1 isolate select-none font-inter w-full",
        !embedded && "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card"
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm table-fixed">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:bg-card dark:border-white/10">
            <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500 h-11">
              <th className="p-4 min-w-[140px]">
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              <th className="p-4 min-w-[180px]">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="p-4 min-w-[160px]">
                <Skeleton className="h-3.5 w-28 dark:bg-muted" />
              </th>
              <th className="p-4 min-w-[110px]">
                <Skeleton className="h-3.5 w-16 dark:bg-muted" />
              </th>
              <th className="p-4 min-w-[140px]">
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              <th className="p-4 min-w-[120px]">
                <Skeleton className="h-3.5 w-18 dark:bg-muted" />
              </th>
              <th className="p-4 text-right min-w-[100px]">
                <Skeleton className="h-3.5 w-14 ml-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="h-[60px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0"
              >
                {/* Student No */}
                <td className="p-4 align-middle">
                  <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                </td>

                {/* Name */}
                <td className="p-4 align-middle">
                  <div className="space-y-1">
                    <Skeleton
                      className={cn(
                        "h-3.5 rounded dark:bg-muted",
                        i % 3 === 0 ? "w-36" : i % 2 === 0 ? "w-44" : "w-32"
                      )}
                    />
                    <Skeleton className="h-2.5 w-20 rounded dark:bg-muted" />
                  </div>
                </td>

                {/* Document Type */}
                <td className="p-4 align-middle">
                  <Skeleton className="h-6 w-32 rounded-full dark:bg-muted" />
                </td>

                {/* Status */}
                <td className="p-4 align-middle">
                  <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                </td>

                {/* File */}
                <td className="p-4 align-middle">
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                    <Skeleton className="h-2.5 w-16 rounded dark:bg-muted" />
                  </div>
                </td>

                {/* Created */}
                <td className="p-4 align-middle">
                  <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                </td>

                {/* Actions */}
                <td className="p-4 align-middle text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Skeleton className="h-8 w-14 rounded-xl dark:bg-muted" />
                    <Skeleton className="h-8 w-14 rounded-xl dark:bg-muted" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-white p-4 px-6 dark:border-white/10 dark:bg-card mt-auto">
        <Skeleton className="h-3.5 w-40 rounded dark:bg-muted" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-xl dark:bg-muted" />
          <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
          <Skeleton className="h-8 w-16 rounded-xl dark:bg-muted" />
        </div>
      </div>
    </div>
  )
}

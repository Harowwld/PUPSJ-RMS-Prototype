"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function DocumentsMatrixSkeleton({ rowCount = 7, embedded = false }) {
  return (
    <div
      className={cn(
        "flex flex-col flex-1 isolate select-none font-jakarta w-full",
        embedded
          ? "overflow-hidden rounded-b-2xl border-t border-border dark:border-border"
          : "overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card"
      )}
    >
      <div className="flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2">
        <table className="w-full text-sm border-collapse min-w-[960px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
              <th className="py-3 px-4 w-[15%]">
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[22%]">
                <Skeleton className="h-3.5 w-28 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[18%]">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[12%]">
                <Skeleton className="h-3.5 w-16 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[18%]">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[10%]">
                <Skeleton className="h-3.5 w-16 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 pr-6 text-right w-20">
                <Skeleton className="h-3.5 w-12 ml-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="h-[60px] border-b border-border dark:border-border last:border-b-0"
              >
                {/* Student No */}
                <td className="py-3 px-4 align-middle">
                  <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                </td>

                {/* Name */}
                <td className="py-3 px-4 align-middle">
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
                <td className="py-3 px-4 align-middle">
                  <Skeleton className="h-6 w-28 rounded-full dark:bg-muted" />
                </td>

                {/* Status */}
                <td className="py-3 px-4 align-middle">
                  <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                </td>

                {/* File */}
                <td className="py-3 px-4 align-middle">
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                    <Skeleton className="h-2.5 w-16 rounded dark:bg-muted" />
                  </div>
                </td>

                {/* Created */}
                <td className="py-3 px-4 align-middle">
                  <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
                </td>

                {/* Actions */}
                <td className="py-3 px-4 pr-6 align-middle text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted ml-auto" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-border bg-white p-4 px-6 dark:border-border dark:bg-card mt-auto rounded-b-2xl">
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

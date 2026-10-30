"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function DocumentRequestsTableSkeleton({ rowCount = 7, embedded = false }) {
  return (
    <div className={cn(
      "flex flex-col flex-1 w-full isolate select-none font-jakarta",
      embedded
        ? "overflow-hidden rounded-b-2xl border-t border-border dark:border-border"
        : "overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card"
    )}>
      <div className="flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2">
        <table className="w-full text-sm border-collapse min-w-[1000px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
              <th className="py-3 px-4 w-[8%]">
                <Skeleton className="h-3.5 w-8 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[22%]">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[18%]">
                <Skeleton className="h-3.5 w-28 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[12%]">
                <Skeleton className="h-3.5 w-16 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[22%]">
                <Skeleton className="h-3.5 w-32 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[11%]">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 pr-6 text-right w-[7%]">
                <Skeleton className="h-3.5 w-10 ml-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="h-[60px] border-b border-border dark:border-border last:border-b-0"
              >
                {/* ID */}
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-3.5 w-10 dark:bg-muted" />
                </td>

                {/* Student / Requester */}
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full dark:bg-muted shrink-0" />
                    <div className="space-y-1">
                      <Skeleton
                        className={cn(
                          "h-3.5 rounded dark:bg-muted",
                          i % 3 === 0 ? "w-32" : i % 2 === 0 ? "w-40" : "w-28"
                        )}
                      />
                      <Skeleton className="h-2.5 w-24 rounded dark:bg-muted" />
                    </div>
                  </div>
                </td>

                {/* Document Type */}
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-6 w-32 rounded-full dark:bg-muted" />
                </td>

                {/* Status */}
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                </td>

                {/* Processing Time */}
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
                      <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
                    </div>
                    <Skeleton className="h-2.5 w-32 rounded dark:bg-muted" />
                  </div>
                </td>

                {/* Created At */}
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70">
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                    <Skeleton className="h-2.5 w-16 rounded dark:bg-muted" />
                  </div>
                </td>

                {/* Actions */}
                <td className="py-3 px-4 pr-6 align-middle text-right">
                  <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-border bg-white p-4 px-6 dark:border-border dark:bg-card mt-auto rounded-b-2xl">
        <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-lg dark:bg-muted" />
          <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
          <Skeleton className="h-8 w-16 rounded-lg dark:bg-muted" />
        </div>
      </div>
    </div>
  )
}

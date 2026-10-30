"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function DirectoryTableSkeleton({ rowCount = 8 }) {
  return (
    <div className="overflow-hidden rounded-b-2xl bg-white dark:bg-card flex flex-col flex-1 isolate">
      <div className="flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none">
        <table className="w-full text-sm border-collapse min-w-[960px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
              <th className="w-12 p-4 text-center">
                <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
              </th>
              <th className="p-4 w-[22%]">
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              <th className="p-4 w-[28%]">
                <Skeleton className="h-3.5 w-36 dark:bg-muted" />
              </th>
              <th className="p-4 w-[20%]">
                <Skeleton className="h-3.5 w-28 dark:bg-muted" />
              </th>
              <th className="p-4 w-[20%]">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="w-28 p-4 pr-6 text-right">
                <Skeleton className="h-3.5 w-14 ml-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="h-[56px] border-b border-border dark:border-border last:border-b-0 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors"
              >
                <td className="w-12 p-4 align-middle text-center border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
                </td>
                <td className="p-4 align-middle border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-4 w-28 font-mono rounded dark:bg-muted" />
                </td>
                <td className="p-4 align-middle border-r border-border/70 dark:border-border/70">
                  <div className="flex flex-col gap-1.5">
                    <Skeleton
                      className={cn(
                        "h-4 rounded dark:bg-muted",
                        i % 3 === 0 ? "w-40" : i % 2 === 0 ? "w-48" : "w-32"
                      )}
                    />
                    <Skeleton className="h-3 w-44 rounded dark:bg-muted" />
                  </div>
                </td>
                <td className="p-4 align-middle border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-6 w-32 rounded-lg dark:bg-muted" />
                </td>
                <td className="p-4 align-middle border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                </td>
                <td className="w-28 p-4 pr-6 align-middle text-right">
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

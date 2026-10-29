"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function TransactionsTableSkeleton({ rowCount = 8 }) {
  return (
    <div className="overflow-hidden rounded-b-2xl bg-white dark:bg-card flex flex-col flex-1 isolate">
      <div className="flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2">
        <table className="w-full text-sm border-collapse min-w-[1240px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
              <th className="py-3 px-4 w-[100px] min-w-[100px]">
                <Skeleton className="h-3.5 w-10 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[130px] min-w-[130px]">
                <Skeleton className="h-3.5 w-16 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[200px] min-w-[200px]">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[270px] min-w-[270px]">
                <Skeleton className="h-3.5 w-32 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[190px] min-w-[190px]">
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[140px] min-w-[140px]">
                <Skeleton className="h-3.5 w-16 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[130px] min-w-[130px]">
                <Skeleton className="h-3.5 w-14 dark:bg-muted" />
              </th>
              <th className="py-3 px-4 pr-6 text-right w-[80px] min-w-[80px]">
                <Skeleton className="h-3.5 w-10 ml-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="h-[52px] border-b border-border dark:border-border last:border-b-0"
              >
                <td className="py-3 px-4 align-middle">
                  <Skeleton className="h-5 w-10 rounded-md dark:bg-muted" />
                </td>
                <td className="py-3 px-4 align-middle">
                  <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                </td>
                <td className="py-3 px-4 align-middle">
                  <div className="flex flex-col gap-1">
                    <Skeleton
                      className={cn(
                        "h-3.5 rounded dark:bg-muted",
                        i % 2 === 0 ? "w-28" : "w-36"
                      )}
                    />
                    <Skeleton className="h-2.5 w-20 font-mono rounded dark:bg-muted" />
                  </div>
                </td>
                <td className="py-3 px-4 align-middle">
                  <Skeleton
                    className={cn(
                      "h-3.5 rounded dark:bg-muted",
                      i % 3 === 0 ? "w-40" : "w-48"
                    )}
                  />
                </td>
                <td className="py-3 px-4 align-middle">
                  <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                </td>
                <td className="py-3 px-4 align-middle">
                  <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                </td>
                <td className="py-3 px-4 align-middle">
                  <Skeleton className="h-3 w-16 font-mono rounded dark:bg-muted" />
                </td>
                <td className="py-3 px-4 pr-6 align-middle text-right">
                  <Skeleton className="h-7 w-7 ml-auto rounded-lg dark:bg-muted" />
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

"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function AuditLogsTableSkeleton({ rowCount = 8, embedded = false }) {
  return (
    <div
      className={cn(
        "overflow-hidden isolate flex flex-col flex-1",
        embedded
          ? "border-t border-gray-100 dark:border-white/10"
          : "rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card shadow-sm"
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
            <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500 h-11 select-none">
              <th className="w-12 p-4 text-center">
                <Skeleton className="h-3.5 w-3.5 rounded mx-auto dark:bg-muted" />
              </th>
              <th className="p-4 w-44">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="p-4 w-28">
                <Skeleton className="h-3.5 w-14 dark:bg-muted" />
              </th>
              <th className="p-4 w-36">
                <Skeleton className="h-3.5 w-16 dark:bg-muted" />
              </th>
              <th className="p-4 w-36">
                <Skeleton className="h-3.5 w-16 dark:bg-muted" />
              </th>
              <th className="p-4 w-44">
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              <th className="p-4">
                <Skeleton className="h-3.5 w-28 dark:bg-muted" />
              </th>
              <th className="p-4 pr-6 text-right w-24">
                <Skeleton className="h-3.5 w-14 ml-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-[#1c1c1e]">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0"
              >
                <td className="py-0 px-4 align-middle text-center">
                  <Skeleton className="h-3.5 w-3.5 rounded mx-auto dark:bg-muted" />
                </td>
                <td className="py-0 px-4 align-middle">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3.5 w-28 font-mono rounded dark:bg-muted" />
                    <Skeleton className="h-2.5 w-16 font-mono rounded dark:bg-muted" />
                  </div>
                </td>
                <td className="py-0 px-4 align-middle">
                  <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
                </td>
                <td className="py-0 px-4 align-middle">
                  <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                </td>
                <td className="py-0 px-4 align-middle">
                  <Skeleton className="h-5 w-20 rounded-md dark:bg-muted" />
                </td>
                <td className="py-0 px-4 align-middle">
                  <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
                </td>
                <td className="py-0 px-4 align-middle">
                  <Skeleton
                    className={cn(
                      "h-3.5 rounded dark:bg-muted",
                      i % 2 === 0 ? "w-48" : "w-64"
                    )}
                  />
                </td>
                <td className="py-0 pr-6 align-middle text-right">
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
      <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl">
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

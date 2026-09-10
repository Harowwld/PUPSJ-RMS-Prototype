"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function OfficeGridSkeleton({ layoutView = "grid", count = 6 }) {
  if (layoutView === "table") {
    return (
      <div className="overflow-hidden bg-white dark:bg-card flex flex-col flex-1 isolate">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 dark:text-zinc-400">
            <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
              <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500 h-11 select-none">
                <th className="p-4 pl-6 min-w-[240px]">
                  <Skeleton className="h-3.5 w-32 dark:bg-muted" />
                </th>
                <th className="p-4 w-24">
                  <Skeleton className="h-3.5 w-16 dark:bg-muted" />
                </th>
                <th className="p-4 min-w-[180px]">
                  <Skeleton className="h-3.5 w-28 dark:bg-muted" />
                </th>
                <th className="p-4 w-36">
                  <Skeleton className="h-3.5 w-24 dark:bg-muted" />
                </th>
                <th className="p-4 w-36">
                  <Skeleton className="h-3.5 w-24 dark:bg-muted" />
                </th>
                <th className="p-4 w-28">
                  <Skeleton className="h-3.5 w-16 dark:bg-muted" />
                </th>
                <th className="p-4 pr-6 text-right w-28">
                  <Skeleton className="h-3.5 w-14 ml-auto dark:bg-muted" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-[#1c1c1e]">
              {Array.from({ length: count }).map((_, i) => (
                <tr
                  key={i}
                  className="h-[56px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0"
                >
                  <td className="py-2 px-4 pl-6 align-middle">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-xl shrink-0 dark:bg-muted" />
                      <div className="flex flex-col gap-1">
                        <Skeleton
                          className={cn(
                            "h-4 rounded dark:bg-muted",
                            i % 2 === 0 ? "w-36" : "w-44"
                          )}
                        />
                        <Skeleton className="h-2.5 w-20 font-mono rounded dark:bg-muted" />
                      </div>
                    </div>
                  </td>
                  <td className="py-0 px-4 align-middle">
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-4 w-4 rounded-full dark:bg-muted" />
                      <Skeleton className="h-3 w-12 rounded dark:bg-muted" />
                    </div>
                  </td>
                  <td className="py-0 px-4 align-middle">
                    <Skeleton className="h-7 w-36 rounded-lg dark:bg-muted" />
                  </td>
                  <td className="py-0 px-4 align-middle">
                    <Skeleton className="h-4 w-16 rounded dark:bg-muted" />
                  </td>
                  <td className="py-0 px-4 align-middle">
                    <Skeleton className="h-4 w-16 rounded dark:bg-muted" />
                  </td>
                  <td className="py-0 px-4 align-middle">
                    <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                  </td>
                  <td className="py-0 pr-6 align-middle text-right">
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
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="overflow-hidden border border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] shadow-[0_2px_8px_rgba(0,0,0,0.03)] rounded-2xl flex flex-col justify-between"
        >
          <CardContent className="p-6 flex flex-col h-full justify-between gap-4">
            <div>
              {/* Header with Icon, Name & ID */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton
                      className={cn(
                        "h-4 rounded dark:bg-muted",
                        i % 2 === 0 ? "w-28" : "w-36"
                      )}
                    />
                    <Skeleton className="h-2.5 w-16 rounded dark:bg-muted" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
              </div>

              {/* Full Description / Subtitle */}
              <div className="space-y-1.5 mb-4">
                <Skeleton className="h-3 w-full rounded dark:bg-muted" />
                <Skeleton className="h-3 w-3/4 rounded dark:bg-muted" />
              </div>

              {/* Token Bar */}
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-white/5 flex items-center justify-between mb-4">
                <Skeleton className="h-3 w-28 font-mono rounded dark:bg-muted" />
                <Skeleton className="h-4 w-4 rounded dark:bg-muted" />
              </div>

              {/* Metrics deep links */}
              <div className="border-t border-gray-100 dark:border-zinc-800 pt-2.5 mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-3.5 w-3.5 rounded dark:bg-muted" />
                  <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-3.5 w-3.5 rounded dark:bg-muted" />
                  <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
              <Skeleton className="h-8 flex-1 rounded-xl dark:bg-muted" />
              <Skeleton className="h-8 w-20 rounded-xl dark:bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

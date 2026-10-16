"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function OfficeGridSkeleton({ layoutView = "grid", count = 6 }) {
  if (layoutView === "table") {
    return (
      <div className="overflow-hidden rounded-b-2xl bg-white dark:bg-card flex flex-col flex-1 isolate select-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 dark:text-zinc-400 table-fixed min-w-[960px]">
            <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-border bg-white dark:bg-card">
              <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500 h-11 select-none">
                <th className="w-12 p-4 text-center align-middle">
                  <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
                </th>
                <th className="p-4 w-[22%] whitespace-nowrap">
                  <Skeleton className="h-3.5 w-32 dark:bg-muted" />
                </th>
                <th className="p-4 w-[28%] whitespace-nowrap">
                  <Skeleton className="h-3.5 w-40 dark:bg-muted" />
                </th>
                <th className="p-4 w-[22%] whitespace-nowrap">
                  <Skeleton className="h-3.5 w-32 dark:bg-muted" />
                </th>
                <th className="p-4 w-[8%] text-center whitespace-nowrap">
                  <Skeleton className="h-3.5 w-10 mx-auto dark:bg-muted" />
                </th>
                <th className="p-4 w-[8%] text-center whitespace-nowrap">
                  <Skeleton className="h-3.5 w-10 mx-auto dark:bg-muted" />
                </th>
                <th className="p-4 w-[8%] whitespace-nowrap">
                  <Skeleton className="h-3.5 w-12 dark:bg-muted" />
                </th>
                <th className="p-4 pr-6 text-right w-20 whitespace-nowrap">
                  <Skeleton className="h-3.5 w-12 ml-auto dark:bg-muted" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-[#1c1c1e]">
              {Array.from({ length: count }).map((_, i) => (
                <tr
                  key={i}
                  className="border-b-[0.5px] border-border dark:border-border last:border-b-0"
                >
                  <td className="w-12 p-4 align-middle text-center">
                    <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
                  </td>
                  <td className="p-4 align-middle whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg shrink-0 dark:bg-muted" />
                      <div className="flex flex-col gap-1">
                        <Skeleton
                          className={cn(
                            "h-3.5 rounded dark:bg-muted",
                            i % 2 === 0 ? "w-24" : "w-28"
                          )}
                        />
                        <Skeleton className="h-2.5 w-16 font-mono rounded dark:bg-muted" />
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-middle overflow-hidden">
                    <div className="flex flex-col gap-1">
                      <Skeleton
                        className={cn(
                          "h-3.5 rounded dark:bg-muted",
                          i % 2 === 0 ? "w-36" : "w-44"
                        )}
                      />
                      <Skeleton className="h-2.5 w-52 rounded dark:bg-muted" />
                    </div>
                  </td>
                  <td className="p-4 align-middle whitespace-nowrap overflow-hidden">
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                      <Skeleton className="h-2.5 w-36 rounded dark:bg-muted" />
                    </div>
                  </td>
                  <td className="p-4 align-middle text-center whitespace-nowrap">
                    <Skeleton className="h-6 w-12 rounded-lg mx-auto dark:bg-muted" />
                  </td>
                  <td className="p-4 align-middle text-center whitespace-nowrap">
                    <Skeleton className="h-6 w-12 rounded-lg mx-auto dark:bg-muted" />
                  </td>
                  <td className="p-4 align-middle whitespace-nowrap">
                    <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
                  </td>
                  <td className="p-4 pr-6 align-middle text-right whitespace-nowrap">
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
        <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl mt-auto">
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="overflow-hidden border border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] shadow-[0_2px_8px_rgba(0,0,0,0.03)] rounded-2xl flex flex-col justify-between p-0 py-0 gap-0"
        >
          {/* Top Banner Skeleton */}
          <div className="h-[72px] w-full rounded-t-[15px] bg-gray-100 dark:bg-zinc-800/60 px-5 flex items-center justify-between border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-xl dark:bg-muted" />
              <Skeleton className="h-4 w-16 rounded-md dark:bg-muted" />
            </div>
            <Skeleton className="h-6 w-18 rounded-full dark:bg-muted" />
          </div>

          <CardContent className="p-6 flex flex-col h-full justify-between gap-4">
            <div>
              {/* Short Name & Full Name Skeleton */}
              <div className="space-y-1.5 mb-4">
                <Skeleton
                  className={cn(
                    "h-4 rounded dark:bg-muted",
                    i % 2 === 0 ? "w-28" : "w-36"
                  )}
                />
                <Skeleton className="h-3 w-48 rounded dark:bg-muted" />
                <Skeleton className="h-3 w-full rounded dark:bg-muted mt-2" />
                <Skeleton className="h-3 w-3/4 rounded dark:bg-muted" />
              </div>

              {/* Metrics deep links */}
              <div className="border-t border-border dark:border-border pt-2.5 mt-2 flex items-center justify-between">
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
            <div className="flex items-center gap-2 pt-3 border-t border-border dark:border-border">
              <Skeleton className="h-8 flex-1 rounded-xl dark:bg-muted" />
              <Skeleton className="h-8 w-20 rounded-xl dark:bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

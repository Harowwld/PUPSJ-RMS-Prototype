"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function ComplianceTableSkeleton({ rowCount = 6 }) {
  return (
    <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card flex flex-col flex-1 isolate select-none">
      {/* Table Toolbar Header */}
      <div className="flex items-center justify-between p-4 px-6 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
          <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
        </div>
        <Skeleton className="h-9 w-56 rounded-lg dark:bg-muted" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white dark:bg-card border-b border-gray-100 dark:border-white/5">
            <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500 h-11">
              <th className="p-4 px-6 min-w-[240px]">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="p-4 px-6 text-center min-w-[140px]">
                <Skeleton className="h-3.5 w-24 mx-auto dark:bg-muted" />
              </th>
              <th className="p-4 px-6 text-center min-w-[140px]">
                <Skeleton className="h-3.5 w-24 mx-auto dark:bg-muted" />
              </th>
              <th className="p-4 px-6 text-right min-w-[180px]">
                <Skeleton className="h-3.5 w-24 ml-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="h-[54px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0"
              >
                {/* Program */}
                <td className="py-2 px-6 align-middle">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-16 rounded-md dark:bg-muted shrink-0" />
                    <Skeleton
                      className={cn(
                        "h-3.5 rounded dark:bg-muted",
                        i % 2 === 0 ? "w-48" : "w-60"
                      )}
                    />
                  </div>
                </td>

                {/* Total Students */}
                <td className="py-0 px-6 align-middle text-center">
                  <Skeleton className="h-4 w-12 mx-auto rounded dark:bg-muted font-mono" />
                </td>

                {/* Fully Digitized */}
                <td className="py-0 px-6 align-middle text-center">
                  <Skeleton className="h-4 w-12 mx-auto rounded dark:bg-muted font-mono" />
                </td>

                {/* Completeness */}
                <td className="py-0 px-6 align-middle text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Skeleton className="h-4 w-10 rounded dark:bg-muted" />
                    <div className="h-2 w-24 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                      <Skeleton
                        className={cn(
                          "h-full rounded-full dark:bg-muted",
                          i % 3 === 0 ? "w-4/5" : i % 2 === 0 ? "w-3/5" : "w-1/2"
                        )}
                      />
                    </div>
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

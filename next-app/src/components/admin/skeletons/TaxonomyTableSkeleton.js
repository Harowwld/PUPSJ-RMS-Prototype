"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function TaxonomyTableSkeleton({
  rowCount = 6,
  showSubtext = true,
  embedded = false,
  showPagination = true,
}) {
  return (
    <div
      className={cn(
        "flex flex-col flex-1 isolate select-none animate-fade-up",
        embedded
          ? "w-full"
          : "overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card"
      )}
    >
      <div className="overflow-x-auto show-scrollbar pb-2">
        <table className="w-full text-sm border-collapse min-w-[850px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
              <th className="w-12 py-3 px-4 text-center">
                <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
              </th>
              <th className="w-[24%] py-3 px-4">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="w-[48%] py-3 px-4">
                <Skeleton className="h-3.5 w-32 dark:bg-muted" />
              </th>
              <th className="w-[14%] py-3 px-4">
                <Skeleton className="h-3.5 w-16 dark:bg-muted" />
              </th>
              <th className="w-28 py-3 px-4 pr-6 text-right">
                <Skeleton className="h-3.5 w-14 ml-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="border-b border-border dark:border-border last:border-b-0"
              >
                {/* Checkbox */}
                <td className="py-3 px-4 align-middle text-center">
                  <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
                </td>

                {/* Primary Code / Identifier */}
                <td className="py-3 px-4 align-middle whitespace-nowrap">
                  <Skeleton className="h-4 w-20 rounded dark:bg-muted" />
                </td>

                {/* Designation / Block / Scope */}
                <td className="py-3 px-4 align-middle overflow-hidden">
                  <div className="flex flex-col gap-1">
                    <Skeleton
                      className={cn(
                        "h-4 rounded dark:bg-muted",
                        i % 3 === 0 ? "w-48" : i % 2 === 0 ? "w-60" : "w-40"
                      )}
                    />
                    {showSubtext && (
                      <Skeleton className="h-2.5 w-28 rounded dark:bg-muted" />
                    )}
                  </div>
                </td>

                {/* Status Badge */}
                <td className="py-3 px-4 align-middle whitespace-nowrap">
                  <Skeleton className="h-6 w-16 rounded-full dark:bg-muted" />
                </td>

                {/* Actions */}
                <td className="py-3 px-4 pr-6 align-middle text-right whitespace-nowrap">
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

      {/* Pagination Footer */}
      {showPagination && (
        <div className="flex items-center justify-between border-t border-border dark:border-border bg-white dark:bg-card p-4 px-6 rounded-b-2xl mt-auto">
          <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16 rounded-xl dark:bg-muted" />
            <Skeleton className="h-8 w-16 rounded-xl dark:bg-muted" />
          </div>
        </div>
      )}
    </div>
  )
}

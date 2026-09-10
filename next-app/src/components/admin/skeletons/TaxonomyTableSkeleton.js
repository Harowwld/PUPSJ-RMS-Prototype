"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function TaxonomyTableSkeleton({
  rowCount = 6,
  secondaryColumnName = "Status",
  showSubtext = true,
}) {
  return (
    <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card flex flex-col flex-1 isolate select-none animate-fade-up">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:bg-card dark:border-white/10">
            <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500 h-11">
              <th className="w-12 p-4 text-center">
                <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
              </th>
              <th className="p-4 px-6 min-w-[280px]">
                <Skeleton className="h-3.5 w-32 dark:bg-muted" />
              </th>
              <th className="w-48 p-4 px-6 min-w-[140px]">
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              <th className="w-32 p-4 px-6 text-right min-w-[100px]">
                <Skeleton className="h-3.5 w-14 ml-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="h-[56px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0"
              >
                {/* Checkbox */}
                <td className="py-0 px-4 align-middle text-center">
                  <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
                </td>

                {/* Primary Name / Code */}
                <td className="py-2 px-6 align-middle">
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
                <td className="py-0 px-6 align-middle">
                  <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                </td>

                {/* Actions */}
                <td className="py-0 px-6 align-middle text-right">
                  <div className="flex items-center justify-end gap-2">
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
      <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-card p-4 px-6 rounded-b-brand mt-auto">
        <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-xl dark:bg-muted" />
          <Skeleton className="h-8 w-16 rounded-xl dark:bg-muted" />
        </div>
      </div>
    </div>
  )
}

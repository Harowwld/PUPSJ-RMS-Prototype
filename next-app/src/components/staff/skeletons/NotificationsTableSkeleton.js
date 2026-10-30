"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function NotificationsTableSkeleton({ rowCount = 6, embedded = false }) {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col animate-fade-up font-jakarta select-none overflow-hidden",
        !embedded && "border border-border rounded-2xl dark:border-border bg-white dark:bg-card shadow-sm"
      )}
    >
      <div className="overflow-x-auto w-full show-scrollbar pb-2">
        <table className="w-full border-collapse min-w-[1000px] text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
              <th className="w-[13%] py-3 px-4">
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              <th className="w-[11%] py-3 px-4">
                <Skeleton className="h-3.5 w-16 dark:bg-muted" />
              </th>
              <th className="w-[17%] py-3 px-4">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="w-[15%] py-3 px-4">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>
              <th className="w-[19%] py-3 px-4">
                <Skeleton className="h-3.5 w-32 dark:bg-muted" />
              </th>
              <th className="w-[12%] py-3 px-4">
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>
              <th className="w-[9%] py-3 px-4">
                <Skeleton className="h-3.5 w-16 dark:bg-muted" />
              </th>
              <th className="w-24 py-3 px-4 pr-6 text-right">
                <Skeleton className="h-3.5 w-12 ml-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="h-[56px] border-b border-border dark:border-border last:border-b-0"
              >
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-6 w-24 rounded-full dark:bg-muted" />
                </td>
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                </td>
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70">
                  <Skeleton className={cn("h-4 rounded dark:bg-muted", i % 2 === 0 ? "w-28" : "w-36")} />
                </td>
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-6 w-24 rounded-full dark:bg-muted" />
                </td>
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70">
                  <Skeleton className={cn("h-3.5 rounded dark:bg-muted", i % 3 === 0 ? "w-36" : "w-44")} />
                </td>
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
                </td>
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-3.5 w-16 rounded dark:bg-muted" />
                </td>
                <td className="py-3 px-4 pr-6 align-middle text-right">
                  <div className="flex items-center justify-end gap-1.5 ml-auto">
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


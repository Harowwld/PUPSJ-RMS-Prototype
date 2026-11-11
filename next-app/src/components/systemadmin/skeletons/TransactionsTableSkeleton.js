"use client"
import { Fragment } from "react"
import { Table } from "@/components/ui/table";

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function TransactionsTableSkeleton({ rowCount = 8, showPagination = true, visibleColumns = ["department", "requester", "title", "details", "status", "submitted"], groupBy = "none" }) {
  return (
    <div className="overflow-hidden rounded-b-2xl bg-white dark:bg-card flex flex-col flex-1 isolate">
      <div className="flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2">
            <Table columns={[{ kind: "identifier", maxWidth: 180, growthWeight: 0 }, ...visibleColumns.map((key) => {
              if (key === "department") return { kind: "category", maxWidth: 150, growthWeight: 0 }
              if (key === "status" || key === "slaStatus") return { kind: "status", maxWidth: 160, growthWeight: 0 }
              if (key === "submitted" || key === "updatedAt") return { kind: "date", maxWidth: 180, growthWeight: 0 }
              return { kind: "text", maxWidth: key === "details" ? 300 : 340 }
            }), { kind: "actions" }]} className="min-w-0">
          <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
              <th className="py-3 px-4 pl-6">
                <Skeleton className="h-3.5 w-10 dark:bg-muted" />
              </th>
              {visibleColumns.includes("department") && <th className="py-3 px-4">
                <Skeleton className="h-3.5 w-16 dark:bg-muted" />
              </th>}
              {visibleColumns.includes("requester") && <th className="py-3 px-4">
                <Skeleton className="h-3.5 w-24 dark:bg-muted" />
              </th>}
              {visibleColumns.includes("title") && <th className="py-3 px-4">
                <Skeleton className="h-3.5 w-32 dark:bg-muted" />
              </th>}
              {visibleColumns.includes("details") && <th className="py-3 px-4">
                <Skeleton className="h-3.5 w-20 dark:bg-muted" />
              </th>}
              {visibleColumns.includes("status") && <th className="py-3 px-4">
                <Skeleton className="h-3.5 w-16 dark:bg-muted" />
              </th>}
              {visibleColumns.includes("slaStatus") && <th className="py-3 px-4"><Skeleton className="h-3.5 w-16 dark:bg-muted" /></th>}
              {visibleColumns.includes("submitted") && <th className="py-3 px-4">
                <Skeleton className="h-3.5 w-14 dark:bg-muted" />
              </th>}
              {visibleColumns.includes("updatedAt") && <th><Skeleton className="h-3.5 w-24" /></th>}
              <th className="py-3 px-2 text-center w-12 min-w-[48px] max-w-[48px]">
                <Skeleton className="h-3.5 w-8 mx-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <Fragment key={i}>
              {groupBy !== "none" && i % 4 === 0 && <tr className="bg-gray-100/70 dark:bg-zinc-950/60"><td colSpan={visibleColumns.length + 2} className="px-6 py-2.5"><Skeleton className="h-3.5 w-32 rounded dark:bg-muted" /></td></tr>}
              <tr
                className="border-b border-border dark:border-border last:border-b-0"
              >
                <td className="py-3 px-4 pl-6 align-middle border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-5 w-10 rounded-md dark:bg-muted" />
                </td>
                {visibleColumns.includes("department") && <td className="py-3 px-4 align-middle border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                </td>}
                {visibleColumns.includes("requester") && <td className="py-3 px-4 align-middle overflow-hidden border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                  <div className="w-full min-w-0 flex flex-col gap-1">
                    <Skeleton
                      className={cn(
                        "h-3.5 rounded dark:bg-muted",
                        i % 2 === 0 ? "w-28" : "w-36"
                      )}
                    />
                    <Skeleton className="h-2.5 w-20 font-sans tabular-nums rounded dark:bg-muted" />
                  </div>
                </td>}
                {visibleColumns.includes("title") && <td className="py-3 px-4 align-middle overflow-hidden border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                  <div className="w-full min-w-0">
                    <Skeleton
                      className={cn(
                        "h-3.5 rounded dark:bg-muted",
                        i % 3 === 0 ? "w-40" : "w-48"
                      )}
                    />
                  </div>
                </td>}
                {visibleColumns.includes("details") && <td className="py-3 px-4 align-middle overflow-hidden border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                  <div className="w-full min-w-0">
                    <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                  </div>
                </td>}
                {visibleColumns.includes("status") && <td className="py-3 px-4 align-middle border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                </td>}
                {visibleColumns.includes("slaStatus") && <td className="py-3 px-4 align-middle border-b border-border dark:border-border border-r border-border/70 dark:border-border/70"><Skeleton className="h-6 w-20 rounded-full dark:bg-muted" /></td>}
                {visibleColumns.includes("submitted") && <td className="py-3 px-4 align-middle border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-3 w-16 font-sans tabular-nums rounded dark:bg-muted" />
                </td>}
                {visibleColumns.includes("updatedAt") && <td><Skeleton className="h-3.5 w-24" /></td>}
                <td className="py-3 px-2 align-middle text-center border-b border-border dark:border-border w-12 min-w-[48px] max-w-[48px]">
                  <Skeleton className="h-7 w-7 mx-auto rounded-lg dark:bg-muted" />
                </td>
              </tr>
              </Fragment>
            ))}
          </tbody>
            </Table>
      </div>

      {/* Pagination Footer Skeleton */}
      {showPagination && <div className="mt-auto flex items-center justify-between border-t border-border dark:border-border bg-white dark:bg-card p-4 px-6 rounded-b-2xl">
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
      </div>}
    </div>
  )
}

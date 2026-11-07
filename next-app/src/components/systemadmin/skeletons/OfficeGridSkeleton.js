"use client"

import { Fragment } from "react"
import { Table } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const DEFAULT_VISIBLE_COLUMNS = ["department", "office", "station", "staff", "modules", "status"]

function columnDefinition(key) {
  if (key === "department") return { kind: "text", maxWidth: 240 }
  if (key === "office") return { kind: "text", maxWidth: 420, paddingLeft: 4, paddingRight: 0 }
  if (key === "station") return { kind: "text", maxWidth: 280 }
  if (key === "staff" || key === "modules") return { kind: "number", maxWidth: 104 }
  if (key === "status") return { kind: "status", maxWidth: 144 }
  if (key === "created_at" || key === "updated_at") return { kind: "date" }
  return { kind: "text" }
}

function OfficeTableSkeleton({ count, visibleColumns, groupBy, tableContainerRef }) {
  const tableColumns = [
    { kind: "selection" },
    ...visibleColumns.map(columnDefinition),
    { kind: "actions" },
  ]

  const headerWidths = {
    department: "w-32",
    office: "w-40",
    station: "w-36",
    staff: "w-10",
    modules: "w-12",
    status: "w-12",
  }

  const renderHeader = (key) => (
    <th key={key} className={cn("px-4 py-3 whitespace-nowrap", ["staff", "modules", "status"].includes(key) && "text-center")}>
      <div className={cn("flex items-center gap-2", ["staff", "modules"].includes(key) && "justify-center")}>
        <Skeleton className={cn("h-3.5 rounded dark:bg-muted", headerWidths[key] || "w-24")} />
        <Skeleton className="h-2.5 w-2.5 rounded-sm dark:bg-muted" />
      </div>
    </th>
  )

  const renderCell = (key, index) => {
    if (key === "department") {
      return (
        <td key={key} className="px-4 py-3 align-middle border-r border-border/70 dark:border-border/70">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full dark:bg-muted" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className={cn("h-3.5 rounded dark:bg-muted", index % 2 ? "w-24" : "w-28")} />
              <Skeleton className="h-2.5 w-16 rounded dark:bg-muted" />
            </div>
          </div>
        </td>
      )
    }

    if (key === "office") {
      return (
        <td key={key} className="px-4 py-3 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
          <div className="w-full min-w-0 space-y-1">
            <Skeleton className={cn("h-3.5 rounded dark:bg-muted", index % 2 ? "w-1/2" : "w-3/5")} />
            <Skeleton className="h-2.5 w-full max-w-[415px] rounded dark:bg-muted" />
          </div>
        </td>
      )
    }

    if (key === "station") {
      return (
        <td key={key} className="px-4 py-3 align-middle border-r border-border/70 dark:border-border/70">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3 shrink-0 rounded-sm dark:bg-muted" />
              <Skeleton className={cn("h-3 rounded dark:bg-muted", index % 2 ? "w-28" : "w-24")} />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-2.5 w-2.5 shrink-0 rounded-sm dark:bg-muted" />
              <Skeleton className="h-2.5 w-32 rounded dark:bg-muted" />
              <Skeleton className="h-3 w-3 shrink-0 rounded-sm dark:bg-muted" />
            </div>
          </div>
        </td>
      )
    }

    if (key === "staff" || key === "modules") {
      return (
        <td key={key} className="px-4 py-3 align-middle text-center border-r border-border/70 dark:border-border/70">
          <Skeleton className="mx-auto h-6 w-14 rounded-lg dark:bg-muted" />
        </td>
      )
    }

    if (key === "status") {
      return (
        <td key={key} className="px-4 py-3 align-middle border-r border-border/70 dark:border-border/70">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-2 w-2 shrink-0 rounded-full dark:bg-muted" />
            <Skeleton className="h-3 w-12 rounded dark:bg-muted" />
          </div>
        </td>
      )
    }

    return null
  }

  return (
    <>
      <div ref={tableContainerRef} className="flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none">
        <Table columns={tableColumns} className="min-w-[960px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 backdrop-blur-xs dark:bg-zinc-900/90">
            <tr className="h-11 select-none text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
              <th className="w-12 p-4 text-center align-middle">
                <Skeleton className="mx-auto h-4 w-4 rounded dark:bg-muted" />
              </th>
              {visibleColumns.map(renderHeader)}
              <th className="w-12 px-2 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white dark:divide-border dark:bg-card">
            {Array.from({ length: count }).map((_, index) => (
              <Fragment key={index}>
                {groupBy !== "none" && index % 4 === 0 && (
                  <tr key={`group-${index}`} className="bg-gray-50/70 dark:bg-zinc-900/60">
                    <td colSpan={tableColumns.length} className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                        <Skeleton className="h-3 w-4 rounded dark:bg-muted" />
                      </div>
                    </td>
                  </tr>
                )}
                <tr key={`row-${index}`} className="border-b border-border last:border-b-0 dark:border-border">
                  <td className="w-12 p-4 align-middle text-center">
                    <Skeleton className="mx-auto h-4 w-4 rounded dark:bg-muted" />
                  </td>
                  {visibleColumns.map((key) => renderCell(key, index))}
                  <td className="w-12 px-2 py-3 text-center align-middle">
                    <Skeleton className="mx-auto h-7 w-7 rounded-lg dark:bg-muted" />
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="mt-auto flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border bg-white px-6 py-4 text-xs dark:bg-card">
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
          <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-3 w-8 rounded dark:bg-muted" />
            {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-6 w-8 rounded-lg dark:bg-muted" />)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-12 rounded-xl dark:bg-muted" />
          <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
          <Skeleton className="h-8 w-12 rounded-xl dark:bg-muted" />
        </div>
      </div>
    </>
  )
}

function OfficeCardSkeleton({ archived, index }) {
  return (
    <Card
      className={cn(
        "group relative flex flex-col gap-0 overflow-hidden rounded-2xl border p-0 py-0 shadow-xs",
        archived
          ? "border-dashed border-border bg-gray-50/70 opacity-80 dark:border-border dark:bg-zinc-900/40 dark:opacity-75"
          : "border-border bg-white dark:border-border dark:bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="flex min-w-0 items-start gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full dark:bg-muted" />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <Skeleton className={cn("h-4 rounded dark:bg-muted", index % 2 ? "w-24" : "w-28")} />
              <Skeleton className="h-4 w-10 shrink-0 rounded-md dark:bg-muted" />
            </div>
            <Skeleton className={cn("h-3 rounded dark:bg-muted", index % 2 ? "w-36" : "w-44")} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1">
            <Skeleton className="h-2 w-2 rounded-full dark:bg-muted" />
            <Skeleton className="h-3 w-12 rounded dark:bg-muted" />
          </div>
          <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-3.5 p-5 pt-3">
        <div className="space-y-3">
          <Skeleton className="h-3 w-full rounded dark:bg-muted" />
          <div className="space-y-1.5 rounded-xl border border-border bg-gray-50/80 p-2.5 dark:border-border dark:bg-zinc-800/50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <Skeleton className="h-3 w-3 shrink-0 rounded-sm dark:bg-muted" />
                <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
              </div>
              <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <Skeleton className="h-3 w-3 shrink-0 rounded-sm dark:bg-muted" />
                <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
              </div>
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                <Skeleton className="h-3 w-3 shrink-0 rounded-sm dark:bg-muted" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-3 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Skeleton className="h-7 w-20 rounded-lg dark:bg-muted" />
              <Skeleton className="h-7 w-24 rounded-lg dark:bg-muted" />
            </div>
            <Skeleton className="h-9 w-36 shrink-0 rounded-xl dark:bg-muted" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function OfficeGridSkeleton({
  layoutView = "grid",
  count = 6,
  visibleColumns = DEFAULT_VISIBLE_COLUMNS,
  groupBy = "none",
  statusFilter = "Active",
  tableContainerRef,
}) {
  if (layoutView === "table") {
    return (
      <div aria-hidden="true" className="flex flex-1 flex-col overflow-hidden rounded-b-2xl bg-white isolate select-none dark:bg-card">
        <OfficeTableSkeleton count={count} visibleColumns={visibleColumns} groupBy={groupBy} tableContainerRef={tableContainerRef} />
      </div>
    )
  }

  return (
    <div aria-hidden="true" className="flex-[1_0_auto] rounded-b-2xl bg-gray-50/30 p-6 dark:bg-zinc-900/20">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 content-start">
        {Array.from({ length: count }).map((_, index) => (
          <OfficeCardSkeleton key={index} archived={statusFilter === "Inactive"} index={index} />
        ))}
      </div>
    </div>
  )
}

"use client"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PLATFORM_BACKUP_COLUMNS, platformBackupSchema } from "@/components/systemadmin/PlatformBackupTable"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function BackupTableSkeleton({ rowCount = 8, embedded = false, className = "", scope = "office", visibleColumns = PLATFORM_BACKUP_COLUMNS.filter(({ defaultHidden }) => !defaultHidden).map(({ key }) => key), scrollRef }) {
  const showColumn = (key) => !visibleColumns || visibleColumns.includes(key);

  if (scope === "platform") return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-2xl border-t border-border dark:border-border", className)}>
      <div ref={scrollRef} className="show-scrollbar flex min-h-0 w-full flex-1 flex-col overflow-x-auto">
        <Table columns={platformBackupSchema(visibleColumns)}>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="mx-auto h-4 w-4" /></TableHead>
              <TableHead><Skeleton className="h-3.5 w-28" /></TableHead>
              {PLATFORM_BACKUP_COLUMNS.filter(({ key }) => visibleColumns.includes(key)).map(({ key }) => (
                <TableHead key={key}>
                  <Skeleton className={cn("h-3.5", key === "created" ? "w-16" : key === "status" ? "mx-auto w-24" : key === "type" ? "mx-auto w-10" : "ml-auto w-8")} />
                </TableHead>
              ))}
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }, (_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="mx-auto h-4 w-4" /></TableCell>
                <TableCell><Skeleton className={cn("h-4", index % 3 === 0 ? "w-3/4 max-w-72" : index % 2 === 0 ? "w-2/3 max-w-64" : "w-1/2 max-w-52")} /></TableCell>
                {PLATFORM_BACKUP_COLUMNS.filter(({ key }) => visibleColumns.includes(key)).map(({ key }) => (
                  <TableCell key={key}>
                    <Skeleton className={cn(
                      "h-4",
                      key === "actor" && "w-24",
                      key === "size" && "ml-auto w-14",
                      key === "created" && "w-28",
                      key === "type" && "mx-auto w-20",
                      key === "status" && "mx-auto h-6 w-20 rounded-full"
                    )} />
                  </TableCell>
                ))}
                <TableCell><Skeleton className="mx-auto h-7 w-7 rounded-lg" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <nav aria-hidden="true" className="mt-auto flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border bg-white px-6 py-4 text-xs dark:border-border dark:bg-card">
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
          <Skeleton className="h-4 w-36" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-8" />
            <div className="flex items-center gap-0.5 rounded-full border border-black/[0.04] bg-black/[0.04] p-0.5 dark:border-white/[0.08] dark:bg-white/[0.06]">
              {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-5 w-8 rounded-full" />)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-11 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-11 rounded-full" />
        </div>
      </nav>
    </div>
  )
  return (
    <div
      className={cn(
        "w-full flex flex-[1_0_auto] flex-col overflow-hidden isolate",
        embedded
          ? "rounded-b-2xl"
          : "rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card",
        className
      )}
    >
      <div ref={scrollRef} className="w-full flex-[1_0_auto] overflow-x-auto select-none show-scrollbar pb-2">
        <Table
          columns={[
            "selection",
            { kind: "text", growthWeight: 3 },
            ...(showColumn("actor") ? [{ kind: "text", growthWeight: 1 }] : []),
            ...(showColumn("type") ? [{ kind: "category", width: 110 }] : []),
            ...(showColumn("size") ? ["number"] : []),
            ...(showColumn("created") ? ["date"] : []),
            ...(scope === "office" ? (showColumn("status") ? [{ kind: "category", width: 220 }] : []) : (showColumn("status") ? ["status"] : [])),
            "actions",
          ]}
          className="min-w-[1240px]"
        >
          <thead className="sticky top-0 z-10 border-b border-border bg-white dark:bg-card select-none">
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
              <th className="w-12 py-3 px-4 text-center align-middle sticky left-0 z-20 bg-white dark:bg-card border-r border-border/70 dark:border-border/70">
                <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
              </th>
              <th className="py-3 px-4 w-[34%] sticky left-12 z-20 bg-white dark:bg-card border-r border-border/70 dark:border-border/70">
                <Skeleton className="h-3.5 w-28 dark:bg-muted" />
              </th>
              {showColumn("actor") && (
                <th className="py-3 px-4 w-[15%] border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-3.5 w-16 dark:bg-muted" />
                </th>
              )}
              {showColumn("type") && (
                <th className="py-3 px-4 w-[13%] min-w-[150px] text-center border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-3.5 w-16 mx-auto dark:bg-muted" />
                </th>
              )}
              {showColumn("size") && (
                <th className="py-3 px-4 w-[10%] text-center border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-3.5 w-12 mx-auto dark:bg-muted" />
                </th>
              )}
              {showColumn("created") && (
                <th className="py-3 px-4 w-[14%] border-r border-border/70 dark:border-border/70">
                  <Skeleton className="h-3.5 w-24 dark:bg-muted" />
                </th>
              )}
              {showColumn("status") && (
                scope === "office" ? (
                  <th className="py-3 px-4 w-[16%] min-w-[200px] text-center border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-3.5 w-24 mx-auto dark:bg-muted" />
                  </th>
                ) : (
                  <th className="py-3 px-4 w-[16%] min-w-[140px] text-center border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-3.5 w-16 mx-auto dark:bg-muted" />
                  </th>
                )
              )}
              <th className="py-3 px-4 w-20 text-center sticky right-0 z-20 bg-white dark:bg-card border-l border-border/70 dark:border-border/70">
                <Skeleton className="h-3.5 w-12 mx-auto dark:bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr
                key={i}
                className="border-b border-border dark:border-border last:border-b-0"
              >
                <td className="py-3 px-4 align-middle text-center border-r border-border/70 dark:border-border/70 sticky left-0 z-10 bg-white dark:bg-card">
                  <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
                </td>
                <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70 sticky left-12 z-10 bg-white dark:bg-card">
                  <div className="flex items-center gap-3">
                    <Skeleton
                      className={cn(
                        "h-4 rounded dark:bg-muted",
                        i % 3 === 0 ? "w-52" : i % 2 === 0 ? "w-64" : "w-44"
                      )}
                    />
                  </div>
                </td>
                {showColumn("actor") && (
                  <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70 bg-white dark:bg-card">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-6 rounded-full dark:bg-muted" />
                      <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
                    </div>
                  </td>
                )}
                {showColumn("type") && (
                  <td className="py-3 px-4 align-middle text-center border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-5 w-16 rounded-full mx-auto dark:bg-muted" />
                  </td>
                )}
                {showColumn("size") && (
                  <td className="py-3 px-4 align-middle text-center border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-4 w-14 mx-auto rounded dark:bg-muted" />
                  </td>
                )}
                {showColumn("created") && (
                  <td className="py-3 px-4 align-middle border-r border-border/70 dark:border-border/70">
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                      <Skeleton className="h-2.5 w-16 rounded dark:bg-muted" />
                    </div>
                  </td>
                )}
                {showColumn("status") && (
                  <td className="py-3 px-4 align-middle text-center border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-[22px] w-28 rounded-full mx-auto dark:bg-muted" />
                  </td>
                )}
                <td className="py-3 px-4 align-middle text-center sticky right-0 z-10 bg-white dark:bg-card border-l border-border/70 dark:border-border/70">
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-8 w-8 rounded-lg mx-auto dark:bg-muted" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Pagination Footer Skeleton */}
      <div className="mt-auto flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl">
        <div className="flex items-center gap-6">
          <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
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

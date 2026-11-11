"use client"
import { Table } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import { cn } from "@/lib/utils"

export default function StaffDirectorySkeleton({ rowCount = 8, layoutView = "table" }) {
  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta select-none">
      {/* Main Single Card Container */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* Header with Title, Inline Metrics and Action Buttons */}
        <PageHeader
          icon="UserSearch01Icon"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Staff Directory</span>
              <Skeleton className="h-3.5 w-32 rounded-full dark:bg-muted" />
            </div>
          }
          description="Manage office personnel and administrative access."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        {/* Connected Tabs Row: Active/Archived on Left, [Grid] [Table] on Right */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-2.5 dark:border-border bg-white dark:bg-card">
          <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] shrink-0 select-none">
            <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs">
              <span>Active</span>
              <Skeleton className="h-3 w-5 rounded-full dark:bg-muted" />
            </div>
            <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full text-gray-500 dark:text-zinc-400">
              <span>Archived</span>
              <Skeleton className="h-3 w-5 rounded-full dark:bg-muted" />
            </div>
          </div>

          <div className="ml-auto inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] shrink-0 select-none">
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full text-gray-500 dark:text-zinc-400">
              <Skeleton className="h-3.5 w-12 rounded-full dark:bg-muted" />
            </div>
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs">
              <Skeleton className="h-3.5 w-12 rounded-full dark:bg-muted" />
            </div>
          </div>
        </div>

        {/* 2-Zone DataViewToolbar */}
        <div className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-card">
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="h-9 w-72 sm:w-80 shrink-0 rounded-xl dark:bg-muted" />
            {layoutView === "table" && (
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <Skeleton className="h-8 w-20 rounded-xl dark:bg-muted" />
                <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
                <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
              </div>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
            {layoutView === "table" && (
              <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
            )}
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Content Area */}
        <div className="w-full flex-[1_0_auto] flex flex-col border-t border-border dark:border-border">
          {layoutView === "grid" ? (
            <div className="p-6 flex-[1_0_auto] bg-gray-50/30 dark:bg-zinc-900/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col justify-between p-4 rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <Skeleton className="size-9 rounded-full dark:bg-muted shrink-0" />
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                          <Skeleton className="h-2.5 w-36 rounded dark:bg-muted" />
                        </div>
                      </div>
                      <Skeleton className="size-6 rounded-lg dark:bg-muted shrink-0" />
                    </div>
                    <div className="mt-3.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50/80 dark:bg-zinc-900/50 divide-y divide-black/[0.05] dark:divide-white/[0.06] overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2">
                        <Skeleton className="h-3 w-10 rounded dark:bg-muted" />
                        <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <Skeleton className="h-3 w-14 rounded dark:bg-muted" />
                        <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <Skeleton className="h-3 w-14 rounded dark:bg-muted" />
                        <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                      </div>
                    </div>
                    <div className="mt-3 pt-0.5 flex items-center justify-between">
                      <Skeleton className="h-5 w-24 rounded-full dark:bg-muted" />
                      <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                    </div>
                  </div>
                ))}
                <div className="flex min-h-[196px] w-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-black/[0.14] dark:border-white/15 bg-white/60 dark:bg-zinc-900/30 p-4">
                  <Skeleton className="size-10 rounded-full dark:bg-muted" />
                  <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                  <Skeleton className="h-2.5 w-32 rounded dark:bg-muted" />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full flex-[1_0_auto] overflow-x-auto pb-2">
              <Table columns={["selection", "identifier", { kind: "text", maxWidth: 420 }, "category", "status", "date", "actions"]} className="min-w-[1240px]">
                <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                    <th className="w-12 p-4 text-center sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90">
                      <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
                    </th>
                    <th className="p-4 w-[16%] min-w-[150px] sticky left-12 z-20 bg-gray-50/90 dark:bg-zinc-900/90">
                      <Skeleton className="h-3.5 w-20 dark:bg-muted" />
                    </th>
                    <th className="p-4 w-[33%]">
                      <Skeleton className="h-3.5 w-28 dark:bg-muted" />
                    </th>
                    <th className="p-4 w-[15%]">
                      <Skeleton className="h-3.5 w-16 dark:bg-muted" />
                    </th>
                    <th className="p-4 w-[9%] min-w-[100px]">
                      <Skeleton className="h-3.5 w-14 dark:bg-muted" />
                    </th>
                    <th className="p-4 w-[17%]">
                      <Skeleton className="h-3.5 w-24 dark:bg-muted" />
                    </th>
                    <th className="w-12 p-4 text-center text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      <Skeleton className="h-3.5 w-10 mx-auto dark:bg-muted" />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-border dark:divide-border">
                  {Array.from({ length: rowCount }).map((_, i) => (
                    <tr
                      key={i}
                      className="border-b-[0.5px] border-border dark:border-border last:border-b-0"
                    >
                      <td className="w-12 p-4 align-middle text-center border-r border-border/70 dark:border-border/70 sticky left-0 z-10 bg-white dark:bg-card">
                        <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
                      </td>
                      <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70 sticky left-12 z-10 bg-white dark:bg-card">
                        <Skeleton className="h-6 w-32 rounded-full dark:bg-muted" />
                      </td>
                      <td className="p-4 align-middle border-r border-border/70 dark:border-border/70">
                        <div className="flex flex-col gap-1.5">
                          <Skeleton
                            className={cn(
                              "h-4 rounded dark:bg-muted",
                              i % 2 === 0 ? "w-40" : "w-48"
                            )}
                          />
                          <Skeleton className="h-3 w-44 rounded dark:bg-muted" />
                        </div>
                      </td>
                      <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                        <Skeleton className="h-6 w-24 rounded-full dark:bg-muted" />
                      </td>
                      <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                        <Skeleton className="h-4 w-20 rounded dark:bg-muted" />
                      </td>
                      <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-4 w-24 rounded dark:bg-muted" />
                          <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                        </div>
                      </td>
                      <td className="w-12 p-4 align-middle text-center whitespace-nowrap">
                        <Skeleton className="size-7 rounded-lg mx-auto dark:bg-muted" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-border dark:border-border bg-white dark:bg-card p-4 px-6 rounded-b-2xl mt-auto">
            <div className="flex items-center gap-6">
              <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-8 rounded dark:bg-muted" />
                <div className="flex items-center gap-1">
                  <Skeleton className="h-6 w-7 rounded-lg dark:bg-muted" />
                  <Skeleton className="h-6 w-7 rounded-lg dark:bg-muted" />
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
      </Card>
    </div>
  )
}

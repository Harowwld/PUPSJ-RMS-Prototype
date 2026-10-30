"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import { cn } from "@/lib/utils"

export default function StaffDirectorySkeleton({ rowCount = 8 }) {
  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta select-none">
      {/* Main Single Card Container */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* Header */}
        <PageHeader
          icon="ph-users"
          title="Staff Directory"
          description="Manage office personnel and administrative access."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-32 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        {/* Navigation Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Left: Active vs Archived Tabs */}
          <div className="flex items-center gap-6 shrink-0">
            <Skeleton className="h-5 w-20 rounded dark:bg-muted" />
            <Skeleton className="h-5 w-24 rounded dark:bg-muted" />
          </div>

          {/* Right: Search, Filter, Scroll Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Skeleton className="h-9 w-full sm:w-64 min-w-[200px] rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <Skeleton className="h-8 w-24 rounded-xl dark:bg-muted" />
              <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
              <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="w-full flex-[1_0_auto] flex flex-col border-t border-border dark:border-border">
          <div className="w-full flex-[1_0_auto] overflow-x-auto pb-2">
            <table className="w-full text-sm border-collapse min-w-[1050px]">
              <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                  <th className="w-12 p-4 text-center sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90">
                    <Skeleton className="h-4 w-4 rounded mx-auto dark:bg-muted" />
                  </th>
                  <th className="p-4 w-[18%] min-w-[160px] sticky left-12 z-20 bg-gray-50/90 dark:bg-zinc-900/90">
                    <Skeleton className="h-3.5 w-20 dark:bg-muted" />
                  </th>
                  <th className="p-4 w-[26%]">
                    <Skeleton className="h-3.5 w-28 dark:bg-muted" />
                  </th>
                  <th className="p-4 w-[16%]">
                    <Skeleton className="h-3.5 w-16 dark:bg-muted" />
                  </th>
                  <th className="p-4 w-[14%]">
                    <Skeleton className="h-3.5 w-20 dark:bg-muted" />
                  </th>
                  <th className="p-4 w-[18%]">
                    <Skeleton className="h-3.5 w-24 dark:bg-muted" />
                  </th>
                  <th className="w-24 p-4 pr-6 text-right text-xs font-semibold text-gray-500 dark:text-zinc-400">
                    <Skeleton className="h-3.5 w-14 ml-auto dark:bg-muted" />
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
                    <td className="w-24 p-4 pr-6 align-middle text-right whitespace-nowrap">
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
          <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl mt-auto">
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

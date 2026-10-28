"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function StudentDirectorySkeleton() {
  return (
    <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up select-none">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* 1. Header */}
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-3.5 w-60 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        {/* 2. Top Summary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 pb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/40 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24 rounded" />
                <Skeleton className="h-6 w-6 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-20 rounded" />
              <Skeleton className="h-3 w-36 rounded" />
            </div>
          ))}
        </div>

        {/* 3. Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2.5 flex-1">
            <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>

        {/* 4. Filter Chips & Scroll Controls */}
        <div className="border-t border-border dark:border-border px-6 py-2.5 flex items-center justify-between gap-4 bg-white dark:bg-card">
          <Skeleton className="h-4 w-40 rounded" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>

        {/* 5. Main Data Table */}
        <div className="w-full flex-[1_0_auto] border-t border-border dark:border-border bg-white dark:bg-card overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[1100px]">
            <thead className="border-b border-border bg-gray-50/90 dark:bg-zinc-900/90">
              <tr className="h-11">
                <th className="w-12 p-4 text-center border-r border-border/80 dark:border-border">
                  <Skeleton className="h-4 w-4 mx-auto rounded" />
                </th>
                <th className="p-4 w-[160px] border-r border-border/80 dark:border-border">
                  <Skeleton className="h-3.5 w-24 rounded" />
                </th>
                <th className="p-4 w-[240px] border-r border-border/80 dark:border-border">
                  <Skeleton className="h-3.5 w-28 rounded" />
                </th>
                <th className="p-4 w-[190px] border-r border-border/80 dark:border-border">
                  <Skeleton className="h-3.5 w-32 rounded" />
                </th>
                <th className="p-4 w-[130px] border-r border-border/80 dark:border-border">
                  <Skeleton className="h-3.5 w-20 rounded" />
                </th>
                <th className="p-4 w-[200px] border-r border-border/80 dark:border-border">
                  <Skeleton className="h-3.5 w-28 rounded" />
                </th>
                <th className="p-4 w-[100px] text-center border-r border-border/80 dark:border-border">
                  <Skeleton className="h-3.5 w-12 mx-auto rounded" />
                </th>
                <th className="p-4 w-[120px] text-center border-r border-border/80 dark:border-border">
                  <Skeleton className="h-3.5 w-14 mx-auto rounded" />
                </th>
                <th className="w-28 p-4 text-right">
                  <Skeleton className="h-3.5 w-14 ml-auto rounded" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="h-14">
                  <td className="w-12 p-4 text-center border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-4 w-4 mx-auto rounded" />
                  </td>
                  <td className="p-4 border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-6 w-28 rounded-full" />
                  </td>
                  <td className="p-4 border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-4 w-36 rounded" />
                  </td>
                  <td className="p-4 border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </td>
                  <td className="p-4 border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-4 w-16 rounded" />
                  </td>
                  <td className="p-4 border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-4 w-32 rounded" />
                  </td>
                  <td className="p-4 text-center border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-5 w-8 mx-auto rounded-full" />
                  </td>
                  <td className="p-4 text-center border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-5 w-16 mx-auto rounded-full" />
                  </td>
                  <td className="p-4 text-right">
                    <Skeleton className="h-7 w-7 ml-auto rounded-lg" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 6. Pagination Footer */}
        <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl mt-auto">
          <div className="flex items-center gap-6">
            <Skeleton className="h-3.5 w-32 rounded" />
            <div className="hidden sm:flex items-center gap-2">
              <Skeleton className="h-3.5 w-10 rounded" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-6 w-7 rounded-lg" />
                <Skeleton className="h-6 w-7 rounded-lg" />
                <Skeleton className="h-6 w-7 rounded-lg" />
                <Skeleton className="h-6 w-7 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-14 rounded-xl" />
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-8 w-14 rounded-xl" />
          </div>
        </div>
      </Card>
    </div>
  )
}

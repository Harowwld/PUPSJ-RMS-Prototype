"use client"
import { Table } from "@/components/ui/table";

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function StudentOrganizationsSkeleton() {
  return (
    <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up select-none">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* 1. Header */}
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-48 rounded" />
              <Skeleton className="h-3.5 w-72 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>

        {/* 2. Top Summary KPI Cards */}
        <div className="px-6 pb-6">
          <div className="p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-5 rounded-full" />
                      <Skeleton className="h-3.5 w-24 rounded" />
                    </div>
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-7 w-16 rounded mt-2" />
                  <Skeleton className="h-3 w-40 rounded mt-2" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Connected Row: Category Navigation & View Switcher */}
        <div className="flex items-center justify-between border-t border-border bg-white px-6 py-2.5 dark:border-border dark:bg-card">
          <div className="inline-flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-full border border-black/[0.04] dark:border-white/[0.08]">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
          <div className="inline-flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-full border border-black/[0.04] dark:border-white/[0.08]">
            <Skeleton className="h-7 w-14 rounded-full" />
            <Skeleton className="h-7 w-14 rounded-full" />
          </div>
        </div>

        {/* 3. Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-card">
          <div className="flex items-center gap-2.5 flex-1">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>

        {/* 4. Active Filters & Scroll Controls */}
        <div className="border-t border-border dark:border-border px-6 py-2.5 flex items-center justify-between gap-4 bg-white dark:bg-card">
          <Skeleton className="h-4 w-44 rounded" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>

        {/* 5. Main Table */}
        <div className="w-full flex-[1_0_auto] overflow-x-auto border-t border-border dark:border-border bg-white dark:bg-card">
          <Table
            columns={[
              { kind: "text", minWidth: 360, maxWidth: 540, growthWeight: 3 },
              { kind: "category", minWidth: 120, maxWidth: 150, growthWeight: 0 },
              { kind: "text", minWidth: 180, maxWidth: 260, growthWeight: 1 },
              { kind: "number", minWidth: 110, maxWidth: 140, growthWeight: 0 },
              { kind: "status", minWidth: 150, maxWidth: 170, growthWeight: 0 },
              { kind: "status", minWidth: 100, maxWidth: 120, growthWeight: 0 },
              "actions",
            ]}
            className="min-w-[1180px]"
          >
            <thead className="border-b border-border bg-gray-50/90 dark:bg-zinc-900/90">
              <tr>
                <th className="p-4 pl-6 w-[380px]">
                  <Skeleton className="h-3.5 w-32 rounded" />
                </th>
                <th className="p-4 w-[130px]">
                  <Skeleton className="h-3.5 w-20 rounded" />
                </th>
                <th className="p-4 w-[200px]">
                  <Skeleton className="h-3.5 w-28 rounded" />
                </th>
                <th className="p-4 w-[120px] text-center">
                  <Skeleton className="h-3.5 w-16 mx-auto rounded" />
                </th>
                <th className="p-4 w-[160px]">
                  <Skeleton className="h-3.5 w-28 rounded" />
                </th>
                <th className="p-4 w-[110px] text-center">
                  <Skeleton className="h-3.5 w-14 mx-auto rounded" />
                </th>
                <th className="p-4 pr-6 text-right w-[80px]">
                  <Skeleton className="h-3.5 w-12 ml-auto rounded" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="p-4 pl-6 border-r border-border/70 dark:border-border/70">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
                      <Skeleton className="h-5 w-12 rounded" />
                      <Skeleton className="h-4 w-52 rounded" />
                    </div>
                  </td>
                  <td className="p-4 border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </td>
                  <td className="p-4 border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-4 w-32 rounded" />
                  </td>
                  <td className="p-4 text-center border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-5 w-12 mx-auto rounded-full" />
                  </td>
                  <td className="p-4 border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-5 w-24 rounded-md" />
                  </td>
                  <td className="p-4 text-center border-r border-border/70 dark:border-border/70">
                    <Skeleton className="h-5 w-16 mx-auto rounded-full" />
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <Skeleton className="h-7 w-7 ml-auto rounded-lg" />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {/* 6. Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-border dark:border-border bg-white dark:bg-card px-6 py-3.5 rounded-b-2xl">
          <Skeleton className="h-3.5 w-44 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
        </div>
      </Card>
    </div>
  )
}

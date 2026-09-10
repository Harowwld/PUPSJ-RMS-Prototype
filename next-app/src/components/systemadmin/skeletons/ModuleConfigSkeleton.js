"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function ModuleConfigSkeleton({ viewMode = "office" }) {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      {/* Header Card matching real PageHeader layout */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-squares-four"
          title="Department Features & Permissions"
          description="Turn system features on or off for each department. Tools are organized by who uses them: supervisors or frontline staff."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800/70 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
              <Skeleton className="h-7 w-28 rounded-lg dark:bg-muted" />
              <Skeleton className="h-7 w-28 rounded-lg dark:bg-muted" />
            </div>
          }
        />

        {/* Toolbar Skeleton */}
        <CardContent className="font-inter bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-5 border-t border-gray-100 dark:border-white/10">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 w-full select-none">
            <div className="flex items-center gap-6 h-10">
              <Skeleton className="h-5 w-24 rounded dark:bg-muted" />
              <Skeleton className="h-5 w-24 rounded dark:bg-muted" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-10 w-64 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-36 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-36 rounded-xl dark:bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Skeleton based on viewMode */}
      {viewMode === "matrix" ? (
        <Card className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/50">
                <tr className="h-12">
                  <th className="p-4 pl-6 w-72">
                    <Skeleton className="h-3.5 w-32 dark:bg-muted" />
                  </th>
                  <th className="p-4 w-28">
                    <Skeleton className="h-3.5 w-16 dark:bg-muted" />
                  </th>
                  {[1, 2, 3, 4].map((j) => (
                    <th key={j} className="p-4 w-32 text-center">
                      <Skeleton className="h-3.5 w-20 mx-auto dark:bg-muted" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i} className="h-14">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
                          <Skeleton className="h-2.5 w-24 rounded dark:bg-muted" />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
                    </td>
                    {[1, 2, 3, 4].map((j) => (
                      <td key={j} className="p-4 text-center">
                        <Skeleton className="h-6 w-11 mx-auto rounded-full dark:bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Department Selector Carousel Skeleton */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400 px-1">
              <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
              <Skeleton className="h-3 w-64 rounded dark:bg-muted" />
            </div>
            <div className="flex items-center gap-3 overflow-hidden py-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-11 w-44 rounded-xl shrink-0 dark:bg-muted" />
              ))}
            </div>
          </div>

          {/* Section 1: Supervisor Tools */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-48 rounded dark:bg-muted" />
              <Skeleton className="h-4 w-12 rounded-full dark:bg-muted" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card
                  key={i}
                  className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-card flex flex-col justify-between h-36"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg dark:bg-muted" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28 rounded dark:bg-muted" />
                        <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-9 rounded-full dark:bg-muted" />
                  </div>
                  <Skeleton className="h-3 w-full rounded dark:bg-muted" />
                </Card>
              ))}
            </div>
          </div>

          {/* Section 2: Staff Tools */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-40 rounded dark:bg-muted" />
              <Skeleton className="h-4 w-12 rounded-full dark:bg-muted" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card
                  key={i}
                  className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-card flex flex-col justify-between h-36"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg dark:bg-muted" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28 rounded dark:bg-muted" />
                        <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-9 rounded-full dark:bg-muted" />
                  </div>
                  <Skeleton className="h-3 w-full rounded dark:bg-muted" />
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

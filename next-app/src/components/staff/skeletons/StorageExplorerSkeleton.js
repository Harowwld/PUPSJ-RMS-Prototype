"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export default function StorageExplorerSkeleton({ embedded = false }) {
  const content = (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4 w-full animate-fade-up font-jakarta select-none px-8 pb-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="gap-3">
          <CardHeader className="flex min-h-6 items-center justify-between gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-28 w-full rounded-xl" />
          </CardContent>
          <CardFooter className="gap-4 py-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )

  if (embedded) return content

  return (
    <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up select-none">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* Header */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-3.5 w-64 rounded" />
            </div>
          </div>
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>

        {/* Breadcrumb toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex items-center justify-between gap-4 bg-white dark:bg-card">
          <Skeleton className="h-4 w-48 rounded" />
        </div>

        {/* Grid content */}
        <div className="flex w-full flex-col flex-[1_0_auto] mx-auto pt-6 bg-white dark:bg-card rounded-b-2xl">
          {content}
        </div>
      </Card>
    </div>
  )
}

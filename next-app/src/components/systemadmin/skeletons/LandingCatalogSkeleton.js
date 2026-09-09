"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function LandingCatalogSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      {/* PageHeader Card Skeleton */}
      <Card className="p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
        <PageHeader
          icon="ph-books"
          title="Academic Document Catalog CMS"
          description="Curate student and alumni document types, requirements, turnaround SLAs, and processing fees."
          showBorder={false}
          titleClassName="text-[18px] font-bold text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-1"
          actions={
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        {/* Search & Filter Toolbar Skeleton */}
        <div className="border-t border-gray-100 dark:border-white/10 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Skeleton className="h-10 w-72 max-w-full rounded-xl dark:bg-muted" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-36 rounded-xl dark:bg-muted" />
          </div>
        </div>
      </Card>

      {/* Catalog Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card
            key={i}
            className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card p-5 shadow-xs flex flex-col justify-between h-[260px]"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
                    <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
              </div>
              <Skeleton className="h-3 w-full rounded dark:bg-muted" />
              <Skeleton className="h-3 w-3/4 rounded dark:bg-muted" />
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded dark:bg-muted" />
              <Skeleton className="h-7 w-16 rounded-lg dark:bg-muted" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

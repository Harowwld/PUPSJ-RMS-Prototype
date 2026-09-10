"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function LandingFooterSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      {/* PageHeader Card Skeleton */}
      <Card className="p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
        <PageHeader
          icon="ph-bold ph-panel-bottom"
          title="Footer Section CMS"
          description="Customize institutional credentials, campus archive location, registrar window schedules, contacts, and navigation links."
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

        {/* Tab switcher skeleton */}
        <div className="flex items-center gap-6 shrink-0 h-10 px-6 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-4 w-36 rounded" />
        </div>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-32 w-full rounded-xl dark:bg-muted" />
              <Skeleton className="h-48 w-full rounded-xl dark:bg-muted" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-xl dark:bg-muted" />
              <Skeleton className="h-40 w-full rounded-xl dark:bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

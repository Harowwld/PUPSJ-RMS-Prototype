"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function LandingWorkflowSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      {/* PageHeader Card Skeleton */}
      <Card className="p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
        <PageHeader
          icon="ph-git-merge"
          title="Process Workflow & Steps CMS"
          description="Manage the 4-step archival lifecycle showcase presented on the public portal."
          showBorder={false}
          titleClassName="text-[18px] font-bold text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-1"
          actions={
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
            </div>
          }
        />
      </Card>

      {/* Section Headline Editor Card Skeleton */}
      <Card className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card p-6 shadow-xs">
        <div className="space-y-4">
          <Skeleton className="h-5 w-44 rounded dark:bg-muted" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
            </div>
          </div>
        </div>
      </Card>

      {/* 4 Workflow Step Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card
            key={i}
            className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card p-5 shadow-xs flex flex-col justify-between h-[280px]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
                <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
              </div>
              <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full rounded dark:bg-muted" />
                <Skeleton className="h-3 w-4/5 rounded dark:bg-muted" />
              </div>
            </div>
            <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />
          </Card>
        ))}
      </div>
    </div>
  )
}

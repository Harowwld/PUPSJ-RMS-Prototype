"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function LandingBentoSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      {/* PageHeader Card Skeleton */}
      <Card className="p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
        <PageHeader
          icon="ph-squares-four"
          title="Features Bento Grid CMS"
          description="Configure the high-impact Bento Grid showcases and micro-interactions on the landing page."
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

      {/* Bento Grid 5-Card Archetype Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card
            key={i}
            className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card p-6 flex flex-col justify-between h-[320px] shadow-xs"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
                <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
              </div>
              <Skeleton className="h-5 w-40 rounded dark:bg-muted" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full rounded dark:bg-muted" />
                <Skeleton className="h-3 w-4/5 rounded dark:bg-muted" />
              </div>
            </div>
            <Skeleton className="h-28 w-full rounded-xl dark:bg-muted" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="md:col-span-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card p-6 flex flex-col justify-between h-[300px] shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
              <Skeleton className="h-5 w-24 rounded-full dark:bg-muted" />
            </div>
            <Skeleton className="h-5 w-48 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-3/4 rounded dark:bg-muted" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl dark:bg-muted" />
        </Card>

        <Card className="md:col-span-2 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card p-6 flex flex-col justify-between h-[300px] shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
              <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
            </div>
            <Skeleton className="h-5 w-36 rounded dark:bg-muted" />
            <Skeleton className="h-3 w-full rounded dark:bg-muted" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl dark:bg-muted" />
        </Card>
      </div>
    </div>
  )
}

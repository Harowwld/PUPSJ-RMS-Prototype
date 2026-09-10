"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function LandingFaqSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      {/* PageHeader Card Skeleton */}
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden">
        <PageHeader
          icon="ph-bold ph-question"
          title="Landing Page CMS · FAQ Section"
          description="Manage frequently asked questions, detailed answers, category tags, and registrar support desk assistance."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Skeleton className="h-10 w-28 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-28 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-32 rounded-xl dark:bg-muted" />
            </div>
          }
        />
      </Card>

      {/* Section Headings Card Skeleton */}
      <Card className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card p-6 shadow-xs">
        <div className="space-y-4">
          <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
            <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
          </div>
          <Skeleton className="h-16 w-full rounded-xl dark:bg-muted" />
        </div>
      </Card>

      {/* FAQ Items List Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-4 w-40 rounded dark:bg-muted" />
          <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
        </div>

        {[1, 2, 3, 4].map((i) => (
          <Card
            key={i}
            className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card p-5 shadow-xs"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-6 rounded dark:bg-muted" />
                  <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                  <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                </div>
              </div>
              <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              <Skeleton className="h-20 w-full rounded-xl dark:bg-muted" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

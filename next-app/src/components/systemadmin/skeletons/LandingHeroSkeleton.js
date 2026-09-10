"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function LandingHeroSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      {/* Top Section Switcher Pill */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100/90 dark:bg-zinc-900/80 border border-gray-200/80 dark:border-white/10 w-fit select-none overflow-x-auto max-w-full">
        {["Hero Section", "Features Bento Grid", "Workflow & Steps", "Academic Catalog", "FAQ Section", "Footer Section"].map((tab, idx) => (
          <div
            key={tab}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${
              idx === 0 ? "bg-white dark:bg-zinc-800 shadow-sm" : "opacity-60"
            }`}
          >
            <Skeleton className="h-3.5 w-20 rounded dark:bg-muted" />
          </div>
        ))}
      </div>

      {/* Main PageHeader Card Skeleton */}
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden">
        <PageHeader
          icon="ph-bold ph-layout"
          title="Landing Page CMS · Hero Section"
          description="Manage public portal headlines, descriptive messaging, campus background photography, and operational details."
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

        {/* Tab switcher inside header */}
        <div className="flex items-center gap-6 shrink-0 h-10 px-6 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card">
          <Skeleton className="h-4 w-28 rounded dark:bg-muted" />
          <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
        </div>

        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
            </div>
            <Skeleton className="h-20 w-full rounded-xl dark:bg-muted" />
          </div>

          {/* Campus Photo Slide Cards */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36 rounded dark:bg-muted" />
              <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card
                  key={i}
                  className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-card shadow-xs"
                >
                  <Skeleton className="aspect-video w-full rounded-none dark:bg-muted" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />
                    <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />
                    <div className="flex items-center justify-between pt-2">
                      <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
                      <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

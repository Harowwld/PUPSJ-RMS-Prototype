"use client"

import LucideIcon from "@/components/shared/LucideIcon";
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function LandingHeroSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full animate-fade-up font-inter">
      {/* Top Section Switcher Pill */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100/90 dark:bg-zinc-900/80 border border-gray-200/80 dark:border-white/10 w-fit select-none overflow-x-auto max-w-full">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 shadow-sm">
          <LucideIcon  className="ph-bold ph-image text-sm" />
          <span>Hero Section</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-gray-500">
          <LucideIcon  className="ph-bold ph-squares-four text-sm" />
          <span>Features Bento Grid</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-gray-500">
          <LucideIcon  className="ph-bold ph-git-merge text-sm" />
          <span>Workflow &amp; Steps</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-gray-500">
          <LucideIcon  className="ph-bold ph-books text-sm" />
          <span>Academic Catalog</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-gray-500">
          <LucideIcon  className="ph-bold ph-question text-sm" />
          <span>FAQ Section</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-gray-500">
          <LucideIcon  className="ph-bold ph-panel-bottom text-sm" />
          <span>Footer Section</span>
        </div>
      </div>

      {/* Main PageHeader Card */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-layout"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Landing Page CMS</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · Hero Section
              </span>
            </div>
          }
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
        <div className="flex items-center gap-6 shrink-0 h-10 px-6 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card select-none">
          <div className="relative h-full flex items-center text-[13px] font-semibold text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50">
            Carousel Photos (4)
          </div>
          <div className="relative h-full flex items-center text-[13px] text-[#8E8E93] font-normal">
            Messaging Information
          </div>
          <div className="relative h-full flex items-center text-[13px] text-[#8E8E93] font-normal">
            Interactive Live Preview
          </div>
        </div>

        <CardContent className="font-inter bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-6">
          <div className="space-y-6">
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Campus Background Photos (4)
                  </span>
                </div>
                <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                  Upload campus photos for the landing page carousel. Drag cards to reorder, or click any image to replace it.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Skeleton className="h-9 w-36 rounded-xl dark:bg-muted" />
                <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
              </div>
            </div>

            {/* Campus Photo Slide Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <Card
                  key={i}
                  className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-card shadow-xs"
                >
                  <Skeleton className="aspect-video w-full rounded-none dark:bg-muted" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />
                    <div className="flex items-center justify-between pt-1">
                      <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
                      <div className="flex items-center gap-1">
                        <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                        <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                        <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
                      </div>
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

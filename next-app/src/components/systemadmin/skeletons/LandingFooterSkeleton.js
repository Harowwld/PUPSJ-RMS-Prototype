"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function LandingFooterSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-panel-bottom"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Landing Page CMS</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · Footer Section
              </span>
            </div>
          }
          description="Customize institutional credentials, campus archive location, registrar window schedules, contacts, and navigation links."
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

        {/* Tab switcher skeleton */}
        <div className="flex items-center gap-6 shrink-0 h-10 px-6 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card select-none">
          <div className="relative h-full flex items-center text-[13px] font-semibold text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50">
            Identity &amp; Watermark
          </div>
          <div className="relative h-full flex items-center text-[13px] text-[#8E8E93] font-normal">
            Schedule &amp; Inquiries (7)
          </div>
          <div className="relative h-full flex items-center text-[13px] text-[#8E8E93] font-normal">
            Interactive Live Preview
          </div>
        </div>

        <CardContent className="font-jakarta bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-5">
                <div>
                  <div className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Physical Archive Location &amp; Mission
                  </div>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                    Credentials and archive hall details displayed in Column 1.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-44 rounded dark:bg-muted" />
                    <Skeleton className="h-20 w-full rounded-xl dark:bg-muted" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                      <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                    </div>
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                      <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                      <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                    </div>
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                      <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Watermark Box */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <Skeleton className="h-4 w-52 rounded dark:bg-muted" />
                <Skeleton className="h-24 w-full rounded-xl dark:bg-muted" />
              </div>
            </div>

            {/* Right Column (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <Skeleton className="h-4 w-44 rounded dark:bg-muted" />
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                  <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                  <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <Skeleton className="h-4 w-48 rounded dark:bg-muted" />
                <Skeleton className="h-12 w-full rounded-xl dark:bg-muted" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function InstitutionalBrandingSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-certificate"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Public Portal &amp; Identity</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · Campus Identity &amp; Branding
              </span>
            </div>
          }
          description="Configure your official university seal, institution name, and color theme for all official reports."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-24 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-20 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-20 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        <CardContent className="font-jakarta bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column (lg:col-span-6): Settings Forms */}
            <div className="lg:col-span-6 space-y-5">
              {/* Institution Identity */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <Skeleton className="h-4 w-48 rounded dark:bg-muted" />
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                  </div>
                </div>
              </div>

              {/* Logo Upload Box */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <Skeleton className="h-4 w-40 rounded dark:bg-muted" />
                <Skeleton className="h-32 w-full rounded-xl dark:bg-muted" />
              </div>

              {/* Accent Color Box */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <Skeleton className="h-4 w-40 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
              </div>
            </div>

            {/* Right Column (lg:col-span-6): Live PDF Simulator */}
            <div className="lg:col-span-6 space-y-5">
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <Skeleton className="h-4 w-52 rounded dark:bg-muted" />
                <Skeleton className="h-[480px] w-full rounded-xl dark:bg-muted" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

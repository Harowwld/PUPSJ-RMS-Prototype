"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import LandingCmsViewTabs from "../LandingCmsViewTabs"

export default function LandingHeroSkeleton() {
  return (
    <div className="flex min-w-0 flex-[1_0_auto] flex-col font-jakarta">
      <Card className="flex min-w-0 flex-[1_0_auto] w-full flex-col gap-0 rounded-none border-0 bg-transparent p-0 shadow-none">
        <PageHeader
          title={<div className="flex flex-wrap items-center gap-[6px]"><span>Landing Page CMS</span><Skeleton className="h-3 w-12 rounded" /><span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">· Hero Section</span></div>}
          description="Manage public portal headlines, descriptive messaging, campus background photography, and operational details."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={<div className="flex flex-wrap items-center gap-2"><Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" /><Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" /><Skeleton className="h-9 w-36 rounded-xl dark:bg-muted" /></div>}
        />
        <LandingCmsViewTabs activeTab="content" contentLabel="Hero Content" />
        <LandingHeroSkeletonContent />
      </Card>
    </div>
  )
}

export function LandingHeroSkeletonContent() {
  return (
    <CardContent aria-busy="true" className="flex flex-[1_0_auto] flex-col gap-6 rounded-b-2xl p-6 font-jakarta">
      <div className="space-y-6">
        <div className="space-y-5 rounded-2xl border border-border bg-white p-6 shadow-2xs dark:bg-card">
          <div className="space-y-1"><h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">Hero Headlines &amp; Institutional Philosophy</h3><p className="text-[12px] text-gray-500 dark:text-zinc-400">Primary large display typography rendered over campus background photography.</p></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2].map((item) => <div key={item} className="space-y-1.5"><Skeleton className="h-3 w-36 rounded" /><Skeleton className="h-10 w-full rounded-xl" /></div>)}
          </div>
          <div className="space-y-1.5"><Skeleton className="h-3 w-52 rounded" /><Skeleton className="h-[84px] w-full rounded-xl" /></div>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-white p-6 shadow-2xs dark:bg-card sm:flex-row sm:items-center">
          <div className="space-y-1"><h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">Campus Background Photos</h3><p className="text-[12px] text-gray-500 dark:text-zinc-400">Upload campus photos for the landing page carousel. Drag cards to reorder, or click any image to replace it.</p></div>
          <div className="flex items-center gap-3"><Skeleton className="h-9 w-[145px] rounded-xl" /><Skeleton className="h-9 w-28 rounded-xl" /></div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="overflow-hidden rounded-2xl border border-border bg-white dark:bg-card"><div className="flex h-12 items-center justify-between border-b border-border px-4"><Skeleton className="h-4 w-24 rounded" /><div className="flex gap-1"><Skeleton className="h-7 w-7 rounded-lg" /><Skeleton className="h-7 w-7 rounded-lg" /><Skeleton className="h-7 w-7 rounded-lg" /></div></div><Skeleton className="aspect-video w-full rounded-none" /><div className="p-4"><Skeleton className="h-9 w-full rounded-xl" /></div></div>)}
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border-2 border-dashed border-border"><Skeleton className="h-12 w-12 rounded-2xl" /></div>
        </div>
      </div>
    </CardContent>
  )
}

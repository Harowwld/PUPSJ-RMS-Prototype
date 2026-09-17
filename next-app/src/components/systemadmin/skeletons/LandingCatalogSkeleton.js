"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function LandingCatalogSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-books"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Landing Page CMS</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · Academic Document Catalog
              </span>
            </div>
          }
          description="Configure authentic university credentials, filing requirements, client eligibility, and interactive Ferris Wheel 3D cards."
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

        {/* Standard Underline Tabs */}
        <div className="flex items-center gap-6 shrink-0 h-10 px-6 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card select-none">
          <div className="relative h-full flex items-center text-[13px] font-semibold text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50">
            Document Cards (6/8)
          </div>
          <div className="relative h-full flex items-center text-[13px] text-[#8E8E93] font-normal">
            Section Header &amp; Narrative
          </div>
          <div className="relative h-full flex items-center text-[13px] text-[#8E8E93] font-normal">
            Interactive Live Preview
          </div>
        </div>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: DOCUMENT CARD LIST */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                      Catalog Credentials
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                      6 of 8
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Select a credential to edit or drag position on the wheel.
                  </p>
                </div>

                <Skeleton className="h-8 w-20 rounded-xl dark:bg-muted" />
              </div>

              {/* Cards List */}
              <div className="flex flex-col gap-2">
                {/* Item 1: Active Selected Card */}
                <div className="p-3.5 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 flex items-center gap-3.5 select-none">
                  <div className="w-7 h-7 rounded-xl bg-pup-maroon text-white flex items-center justify-center font-mono text-[11px] font-bold shrink-0">
                    01
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold font-mono uppercase text-gray-900 dark:text-white px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06]">
                        TOR
                      </span>
                      <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
                    </div>
                    <Skeleton className="h-3 w-40 rounded dark:bg-muted" />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Skeleton className="w-7 h-7 rounded-lg dark:bg-muted" />
                    <Skeleton className="w-7 h-7 rounded-lg dark:bg-muted" />
                    <Skeleton className="w-7 h-7 rounded-lg dark:bg-muted" />
                  </div>
                </div>

                {/* Items 2-4: Inactive Cards */}
                {[
                  { pos: "02", code: "DIP" },
                  { pos: "03", code: "COG" },
                  { pos: "04", code: "HON" },
                ].map((item) => (
                  <div
                    key={item.pos}
                    className="p-3.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 flex items-center gap-3.5 select-none"
                  >
                    <div className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 flex items-center justify-center font-mono text-[11px] font-bold shrink-0">
                      {item.pos}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold font-mono uppercase text-gray-900 dark:text-white px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06]">
                          {item.code}
                        </span>
                        <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
                      </div>
                      <Skeleton className="h-3 w-36 rounded dark:bg-muted" />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Skeleton className="w-7 h-7 rounded-lg dark:bg-muted" />
                      <Skeleton className="w-7 h-7 rounded-lg dark:bg-muted" />
                      <Skeleton className="w-7 h-7 rounded-lg dark:bg-muted" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Card Dashed Button */}
              <div className="w-full py-3.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center">
                <Skeleton className="h-4 w-48 rounded dark:bg-muted" />
              </div>
            </div>

            {/* RIGHT COLUMN: ACTIVE CARD EDITOR */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 flex flex-col gap-5">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 dark:border-white/10">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase font-bold text-pup-maroon dark:text-red-400 tracking-wider">
                      Document Card Editor
                    </span>
                    <Skeleton className="h-5 w-48 rounded dark:bg-muted" />
                  </div>
                  <Skeleton className="h-6 w-28 rounded-full dark:bg-muted" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-3 w-32 rounded dark:bg-muted" />
                  <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />
                  <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

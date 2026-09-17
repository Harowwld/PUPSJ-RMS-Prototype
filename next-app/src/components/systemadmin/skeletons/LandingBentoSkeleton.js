"use client"

import LucideIcon from "@/components/shared/LucideIcon";
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function LandingBentoSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-squares-four"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Landing Page CMS</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · Bento Grid &amp; Features
              </span>
            </div>
          }
          description="Manage public portal bento grid features, SLA turnaround schedules, campus archive locations, and citizen charter commitments."
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

        {/* Standardized SuperAdmin Underline Navigation Tabs */}
        <div className="flex items-center gap-6 shrink-0 h-10 px-6 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card select-none">
          <div className="relative h-full flex items-center text-[13px] font-semibold text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50">
            Bento Cards (5)
          </div>
          <div className="relative h-full flex items-center text-[13px] text-[#8E8E93] font-normal">
            Header &amp; Overview
          </div>
          <div className="relative h-full flex items-center text-[13px] text-[#8E8E93] font-normal">
            Interactive Bento Preview
          </div>
        </div>

        {/* Content Body */}
        <CardContent className="font-inter bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-6">
          <div className="space-y-3">
            {/* ACCORDION CARD 1: EXPANDED (matching activeCardTab = 1) */}
            <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 overflow-hidden">
              <div className="w-full flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-pup-maroon text-white flex items-center justify-center shrink-0">
                    <LucideIcon  className="ph-bold ph-cursor-click text-sm" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 truncate">
                      Card 1: Online Request Simulation
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                      Large interactive card showcasing document and purpose selection.
                    </p>
                  </div>
                </div>
                <LucideIcon  className="ph-bold ph-caret-down text-gray-400 text-sm shrink-0 rotate-180" />
              </div>

              {/* Expanded Form Content */}
              <div className="px-5 pb-5 pt-1 space-y-5 border-t border-gray-200/60 dark:border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-40 rounded dark:bg-muted" />
                  <Skeleton className="h-16 w-full rounded-xl dark:bg-muted" />
                </div>

                {/* Sample Cycled Documents */}
                <div className="space-y-2">
                  <Skeleton className="h-3 w-48 rounded dark:bg-muted" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card space-y-2"
                      >
                        <Skeleton className="h-8 w-full rounded-lg dark:bg-muted" />
                        <Skeleton className="h-8 w-full rounded-lg dark:bg-muted" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ACCORDION CARDS 2-5: COLLAPSED */}
            {[
              {
                icon: "ph-bold ph-clock-countdown",
                title: "Card 2: Processing Turnaround & SLAs",
                desc: "Medium card with active SLA badges and turn-around time commitments.",
              },
              {
                icon: "ph-bold ph-map-pin",
                title: "Card 3: Physical Archives & Floor Plan 3D",
                desc: "Compact card highlighting campus archive storage room and vault safety.",
              },
              {
                icon: "ph-bold ph-shield-check",
                title: "Card 4: Enterprise Multi-Role Access",
                desc: "Compact card demonstrating student, staff, and admin security privileges.",
              },
              {
                icon: "ph-bold ph-scales",
                title: "Card 5: Citizen Charter & Governance",
                desc: "Wide interactive card tabulating ARTA commitments and institutional mandates.",
              },
            ].map((card, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 overflow-hidden"
              >
                <div className="w-full flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gray-200/80 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 flex items-center justify-center shrink-0">
                      <LucideIcon  className={`${card.icon} text-sm`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 truncate">
                        {card.title}
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                  <LucideIcon  className="ph-bold ph-caret-down text-gray-400 text-sm shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

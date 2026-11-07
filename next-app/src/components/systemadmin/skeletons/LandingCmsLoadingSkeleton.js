"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LANDING_CMS_SECTIONS } from "../LandingCmsSectionTabs"
import LandingHeroSkeleton from "./LandingHeroSkeleton"
import LandingWorkflowSkeleton from "./LandingWorkflowSkeleton"
import LandingCatalogSkeleton from "./LandingCatalogSkeleton"
import LandingFaqSkeleton from "./LandingFaqSkeleton"
import LandingFooterSkeleton from "./LandingFooterSkeleton"

const skeletons = {
  hero: LandingHeroSkeleton,
  workflow: LandingWorkflowSkeleton,
  catalog: LandingCatalogSkeleton,
  faq: LandingFaqSkeleton,
  footer: LandingFooterSkeleton,
}

const sectionLabels = [
  { key: "hero", label: "Hero Section" },
  { key: "workflow", label: "Workflow & Steps" },
  { key: "catalog", label: "Academic Catalog" },
  { key: "faq", label: "FAQ Section" },
  { key: "footer", label: "Footer Section" },
]

export default function LandingCmsLoadingSkeleton({ section = "hero" }) {
  const selected = LANDING_CMS_SECTIONS.includes(section) ? section : "hero"
  const SectionSkeleton = skeletons[selected] || LandingHeroSkeleton

  return (
    <div className="flex min-w-0 w-full flex-[1_0_auto] flex-col gap-4 font-jakarta">
      <Card className="flex min-w-0 flex-[1_0_auto] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-sm dark:bg-card dark:shadow-none">
        <div aria-hidden="true" className="flex items-center px-6 py-2.5 border-b border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none">
          <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08]">
            {sectionLabels.map(({ key, label }) => {
              const isActive = key === selected
              return (
                <div
                  key={key}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full select-none",
                    isActive
                      ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs"
                      : "text-gray-500 dark:text-zinc-400"
                  )}
                >
                  <span>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
        <SectionSkeleton />
      </Card>
    </div>
  )
}

"use client"

import { Card } from "@/components/ui/card"
import LandingCmsSectionTabs, { LANDING_CMS_SECTIONS } from "../LandingCmsSectionTabs"
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

export default function LandingCmsLoadingSkeleton({ section = "hero" }) {
  const selected = LANDING_CMS_SECTIONS.includes(section) ? section : "hero"
  const SectionSkeleton = skeletons[selected]

  return (
    <div className="flex min-w-0 w-full flex-[1_0_auto] flex-col gap-4 font-jakarta">
      <Card className="flex min-w-0 flex-[1_0_auto] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-sm dark:bg-card dark:shadow-none">
        <LandingCmsSectionTabs section={selected} />
        <SectionSkeleton />
      </Card>
    </div>
  )
}

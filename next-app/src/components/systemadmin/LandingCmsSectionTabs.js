"use client";

import * as React from "react";
import { GitMergeIcon, HelpCircleIcon, Image01Icon, LayoutBottomIcon, LibraryIcon } from "hugeicons-react";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/tabs";

export const LANDING_CMS_SECTIONS = ["hero", "workflow", "catalog", "faq", "footer"];

const sections = [
  { key: "hero", label: "Hero Section", icon: Image01Icon },
  { key: "workflow", label: "Workflow & Steps", icon: GitMergeIcon },
  { key: "catalog", label: "Academic Catalog", icon: LibraryIcon },
  { key: "faq", label: "FAQ Section", icon: HelpCircleIcon },
  { key: "footer", label: "Footer Section", icon: LayoutBottomIcon },
];

export default function LandingCmsSectionTabs({ section, onSelect, className }) {
  return (
    <div
      role="group"
      aria-label="Landing page section"
      suppressHydrationWarning
      className={cn(
        "flex items-center px-6 py-2.5 border-b border-border/80 dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none",
        className
      )}
    >
      <SegmentedControl
        value={section}
        onValueChange={onSelect}
        variant="capsule"
        className="inline-grid grid-flow-col auto-cols-fr"
        items={sections.map(({ key, label, icon: Icon }) => ({
          value: key,
          label,
          icon: <Icon size={14} aria-hidden="true" />,
        }))}
      />
    </div>
  );
}

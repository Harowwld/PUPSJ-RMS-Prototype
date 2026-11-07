"use client";

import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/tabs";

export default function LandingCmsViewTabs({
  activeTab,
  onChange,
  contentLabel = "Content",
  contentCount,
  previewLabel = "Interactive Live Preview",
  className,
}) {
  return (
    <div
      role="group"
      aria-label="Landing section view"
      className={cn(
        "flex items-center px-6 py-2.5 border-b border-border/80 dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none",
        className
      )}
    >
      <SegmentedControl
        value={activeTab}
        onValueChange={onChange}
        variant="capsule"
        items={[
          {
            value: "content",
            label: contentLabel,
            badge: contentCount,
          },
          {
            value: "preview",
            label: previewLabel,
          },
        ]}
      />
    </div>
  );
}

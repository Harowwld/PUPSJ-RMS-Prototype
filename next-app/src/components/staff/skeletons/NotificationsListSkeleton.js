"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function NotificationsListSkeleton({ groupCount = 2, itemsPerGroup = 3, className }) {
  return (
    <div className={cn("flex-1 flex flex-col gap-6 p-6 font-jakarta select-none animate-fade-up", className)}>
      {Array.from({ length: groupCount }).map((_, gIdx) => (
        <div key={gIdx} className="space-y-2.5">
          {/* Section Header */}
          <div className="flex items-center gap-2 px-1">
            <Skeleton className="h-3.5 w-16 dark:bg-muted" />
          </div>

          {/* Group Card Container */}
          <div className="rounded-2xl border border-border/80 bg-white dark:bg-card overflow-hidden shadow-xs divide-y divide-border/60 dark:divide-border/60">
            {Array.from({ length: itemsPerGroup }).map((_, iIdx) => (
              <div
                key={iIdx}
                className="flex items-center justify-between gap-4 p-4"
              >
                {/* Left: Icon / Avatar badge */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0 dark:bg-muted" />
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <Skeleton className={cn("h-4 rounded dark:bg-muted", iIdx % 2 === 0 ? "w-64" : "w-80")} />
                    <Skeleton className="h-3 w-48 rounded dark:bg-muted" />
                    <div className="flex items-center gap-2 pt-0.5">
                      <Skeleton className="h-2.5 w-20 rounded dark:bg-muted" />
                      <Skeleton className="h-2.5 w-12 rounded dark:bg-muted" />
                    </div>
                  </div>
                </div>

                {/* Right: Action Envelope */}
                <div className="shrink-0 pl-2">
                  <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

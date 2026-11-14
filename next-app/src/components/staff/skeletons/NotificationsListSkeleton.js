"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function NotificationsListSkeleton({ groupCount = 2, itemsPerGroup = 3, className, flush = false, activity = false }) {
  return (
    <div role="status" aria-busy="true" aria-label={activity ? "Loading activity" : "Loading notifications"} className={cn("flex-1 flex flex-col font-jakarta select-none animate-fade-up", !flush && "gap-6 p-6", className)}>
      {Array.from({ length: groupCount }).map((_, gIdx) => (
        <div key={gIdx} aria-hidden="true" className={flush ? "border-b border-border last:border-b-0" : "space-y-2.5"}>
          {/* Section Header */}
          <div className={cn("flex items-center gap-2", flush ? "min-h-11 border-b border-border/70 bg-gray-50/80 px-5 sm:px-6 dark:bg-zinc-900/60" : "px-1")}>
            <Skeleton className="h-3.5 w-16 dark:bg-muted" />
            {activity && <Skeleton className="h-5 w-7 rounded-full" />}
          </div>

          {/* Group Card Container */}
          <div className={cn("divide-y divide-border/60", !flush && "rounded-2xl border border-border/80 bg-white dark:bg-card overflow-hidden shadow-xs")}>
            {Array.from({ length: itemsPerGroup }).map((_, iIdx) => (
              <div
                key={iIdx}
                className={cn("flex items-center justify-between gap-4 py-4", flush ? "px-5 sm:px-6" : "px-4")}
              >
                {/* Left: Icon / Avatar badge */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0 dark:bg-muted" />
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Skeleton className={cn("h-4 max-w-full rounded dark:bg-muted", activity ? "w-36" : "w-64")} />
                      {activity && <Skeleton className="h-5 w-20 rounded-full" />}
                    </div>
                    <Skeleton className="h-3 w-48 max-w-full rounded dark:bg-muted" />
                    <div className="flex items-center gap-2 pt-0.5">
                      <Skeleton className="h-2.5 w-20 rounded dark:bg-muted" />
                      <Skeleton className="h-2.5 w-12 rounded dark:bg-muted" />
                    </div>
                  </div>
                </div>

                {/* Right: Action Envelope */}
                <div className="shrink-0 pl-2">
                  <Skeleton className={cn("rounded-lg dark:bg-muted", activity ? "size-7" : "size-8")} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

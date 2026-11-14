import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getListDensityClasses } from "@/lib/tablePresentation";
import { cn } from "@/lib/utils";

export function StudentChecklistVerificationSkeleton() {
  return (
    <div aria-hidden="true" className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <Skeleton className="h-4 w-72 max-w-full grow basis-64" />
      <Skeleton className="h-11 w-36 shrink-0 rounded-xl sm:h-9" />
    </div>
  );
}

export function StudentComplianceListSkeleton({ density, grouped = false, viewMode = "list" }) {
  const { paddingX, paddingY, gap, minHeight } = getListDensityClasses(density);
  const grid = viewMode === "grid";

  return (
    <div className="min-w-0 flex-1" role="status" aria-label="Loading document checklist" aria-busy="true">
      <div className="divide-y divide-border" aria-hidden="true">
        {Array.from({ length: grouped ? 2 : 1 }, (_, group) => (
          <div key={group}>
            {grouped && (
              <div className="flex min-h-11 items-center gap-2.5 border-b border-border/70 bg-gray-50/80 px-5 sm:px-6 dark:bg-zinc-900/60">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-7 rounded-full" />
              </div>
            )}
            <div className={grid ? "grid grid-cols-1 items-stretch gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3" : "divide-y divide-gray-100 dark:divide-zinc-800/60"}>
              {Array.from({ length: grouped ? 3 : 6 }, (_, row) => grid ? (
                <div key={row} className="flex flex-col justify-between rounded-3xl border border-transparent bg-[#f5f5f7] p-6 sm:p-7 dark:border-white/5 dark:bg-zinc-850/60">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <Skeleton className="size-12 rounded-2xl" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="mb-1 h-3.5 w-20" />
                  <Skeleton className="mb-2 h-5 w-36 max-w-full" />
                  <div className="mb-4 space-y-1">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-3/4" />
                  </div>
                  <div className="flex justify-end border-t border-border pt-3">
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ) : (
                <div key={row} className={cn("flex items-center justify-between", paddingX, paddingY, gap, minHeight)}>
                  <div className="mr-2 flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                    <Skeleton className="size-8 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <Skeleton className="h-4 w-40 max-w-full" />
                      <Skeleton className="h-3 w-64 max-w-full" />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
                    <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="ml-1 size-7 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentComplianceSkeleton() {
  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-0 overflow-hidden p-0">
      <div aria-hidden="true" className="flex flex-col justify-between gap-6 border-b border-border p-6 lg:flex-row lg:items-center">
        <div className="grid min-w-0 gap-2">
          <Skeleton className="h-5 w-44 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="size-10 shrink-0 rounded-xl" />
      </div>
      <div className="bg-muted/30 px-6 py-3">
        <StudentChecklistVerificationSkeleton />
      </div>
      <div aria-hidden="true" className="flex items-center justify-between gap-2 border-y border-border p-4 sm:px-5 sm:py-3">
        <Skeleton className="h-9 w-64 min-w-0 rounded-xl" />
        <Skeleton className="h-9 w-20 shrink-0 rounded-full" />
      </div>
      <StudentComplianceListSkeleton />
    </Card>
  );
}

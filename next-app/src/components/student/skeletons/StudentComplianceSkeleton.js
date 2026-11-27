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

export function StudentComplianceListSkeleton({ density }) {
  const { paddingX, paddingY, gap, minHeight } = getListDensityClasses(density);

  return (
    <div className="min-w-0 flex-1" role="status" aria-label="Loading document checklist" aria-busy="true">
      <div className="divide-y divide-border" aria-hidden="true">
        {[0, 1].map((group) => (
          <div key={group}>
            <div className="border-b border-border bg-gray-50/80 px-5 py-2.5 dark:bg-zinc-900/60">
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="divide-y divide-gray-100 dark:divide-zinc-800/60">
              {[0, 1, 2].map((row) => (
                <div key={row} className={cn("flex items-center", paddingX, paddingY, gap, minHeight)}>
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                  <div className="grid min-w-0 gap-1">
                    <Skeleton className="h-4 w-40 max-w-full" />
                    <Skeleton className="h-3 w-64 max-w-full" />
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

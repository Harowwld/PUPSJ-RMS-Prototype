import { Skeleton } from "@/components/ui/skeleton";

export default function AccountSettingsContentSkeleton({ tab = "profile" }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading account settings" className="space-y-6 p-8">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {tab === "profile" ? (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card/60">
            <Skeleton className="h-44 w-full rounded-none sm:h-52" />
            <div className="relative px-5 pb-6 sm:px-8">
              <div className="-mt-12 mb-4 flex flex-col items-center justify-between gap-4 sm:-mt-14 sm:flex-row sm:items-end">
                <Skeleton className="size-24 rounded-full ring-4 ring-card sm:size-28" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
              <div className="flex flex-col items-center gap-2 sm:items-start">
                <Skeleton className="h-6 w-48 max-w-full" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((field) => (
              <div key={field} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-36 max-w-full" />
                <Skeleton className="h-3.5 w-64 max-w-full" />
              </div>
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

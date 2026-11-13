import NarrativeText from "@/components/shared/NarrativeText";
import { EmptyState } from "@/components/ui/empty";
import { formatPHDateTime } from "@/lib/timeFormat";

export default function SheetEvaluationTimeline({ updates = [] }) {
  if (!updates.length) return <EmptyState variant="compact" title="No Updates Posted Yet" />;

  return (
    <ol className="relative space-y-4">
      {updates.length > 1 && (
        <span aria-hidden="true" className="absolute bottom-2.5 left-2.5 top-2.5 w-0.5 -translate-x-1/2 bg-gray-200 dark:bg-zinc-800" />
      )}
      {updates.map((update) => (
        <li key={update.id} className="relative pl-7">
          <span aria-hidden="true" className="absolute left-2.5 top-1 size-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-pup-maroon shadow-xs ring-2 ring-pup-maroon/20 dark:border-border" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">{update.status}</span>
              {update.actor_name && <span className="text-[11px] text-muted-foreground">by {update.actor_name}</span>}
            </div>
            {update.created_at && (
              <span className="text-[11px] tabular-nums text-gray-500 dark:text-zinc-400">
                {formatPHDateTime(update.created_at)}
              </span>
            )}
          </div>
          {update.message && (
            <div className="mt-1 text-xs leading-relaxed text-gray-700 dark:text-zinc-300">
              <NarrativeText text={update.message} mode="full" />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

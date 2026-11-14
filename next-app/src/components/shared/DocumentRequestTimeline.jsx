import { formatRequestStatus } from "@/lib/auditLogFormatting";
import { Clock01Icon, Time01Icon } from "hugeicons-react";
import NarrativeText from "@/components/shared/NarrativeText";
import SheetSectionHeading from "@/components/shared/SheetSectionHeading";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { formatPHDateTime } from "@/lib/timeFormat";
import { getStatusBadgeClass, BADGE_PALETTES } from "@/lib/badgeStyles";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  Deficient: "Action Required",
  Ready: "Ready for Claiming",
};

export default function DocumentRequestTimeline({ request, showActor = false }) {
  const { updates, status } = request ?? {};
  const entries = Array.isArray(updates) ? updates : [];
  const currentStatusLabel = STATUS_LABELS[status] || formatRequestStatus(status);
  const showCurrentStatus = status && status !== "Pending" && !entries.some((update) => update.status === status);

  return (
    <section className="space-y-3">
      <SheetSectionHeading icon={Clock01Icon} title="Processing Timeline & Updates">
        <Badge variant="gray" size="compact" className="tabular-nums">
          <Time01Icon size={12} aria-hidden="true" />
          {entries.length} {entries.length === 1 ? "update" : "updates"}
        </Badge>
      </SheetSectionHeading>

      {entries.length > 0 || showCurrentStatus ? (
        <ol className="relative space-y-4">
          {entries.length + Number(Boolean(showCurrentStatus)) > 1 && (
            <span aria-hidden="true" className="absolute bottom-2.5 left-2.5 top-2.5 w-0.5 -translate-x-1/2 bg-gray-200 dark:bg-zinc-800" />
          )}
          {entries.map((update, index) => {
            const followUp = index > 0 && update.status === entries[index - 1].status;
            const label = STATUS_LABELS[update.status] || formatRequestStatus(update.status);
            const statusColor = ["Deficient", "PendingPayment"].includes(update.status)
              ? BADGE_PALETTES.amber : getStatusBadgeClass(update.status);
            return (
              <li key={update.id ?? index} className="relative pl-7">
                <span aria-hidden="true" className={cn(
                  "absolute left-2.5 -translate-x-1/2 rounded-full border-2 border-white shadow-xs dark:border-border",
                  followUp ? "top-1.5 size-2.5 bg-gray-400 dark:bg-zinc-500"
                    : "top-1 size-3.5 bg-pup-maroon ring-2 ring-pup-maroon/20",
                )} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn("text-xs", followUp
                      ? "font-semibold text-gray-700 dark:text-zinc-300"
                      : "font-bold text-gray-900 dark:text-zinc-100")}>
                      {followUp ? "Follow-Up Notice" : label}
                    </span>
                    {followUp && <Badge size="compact" className={statusColor}>{label}</Badge>}
                  </div>
                  {update.created_at && (
                    <span className="text-[11px] tabular-nums text-gray-500 dark:text-zinc-400">
                      {formatPHDateTime(update.created_at)}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-600 dark:text-zinc-400">
                  <NarrativeText text={update.message || (showActor ? "Request status updated." : "Status updated by Registrar")} mode="full" />
                </div>
                {showActor && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>By {update.actor_name || "Staff"}</span>
                    {update.actor_id && <Badge variant="gray" size="compact">{update.actor_id}</Badge>}
                  </div>
                )}
              </li>
            );
          })}
          {showCurrentStatus && (
            <li className="relative pl-7">
              <span aria-hidden="true" className="absolute left-2.5 top-1 size-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-emerald-600 shadow-xs ring-2 ring-emerald-600/20 dark:border-border" />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">{currentStatusLabel}</span>
                <Badge variant="success" size="compact">Current Active Status</Badge>
              </div>
              {!showActor && (
                <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">
                  Your document request has been updated to {currentStatusLabel} by the Registrar.
                </p>
              )}
            </li>
          )}
        </ol>
      ) : (
        <EmptyState
          variant="compact"
          icon={Clock01Icon}
          title="No Updates Posted Yet"
          description={showActor ? "Updates to this request will appear here." : "Your request is queued for review by the Registrar."}
        />
      )}
    </section>
  );
}

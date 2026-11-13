import { Badge } from "@/components/ui/badge";

export function OsasSheetSectionHeading({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-1.5 dark:border-border">
      <div className="flex items-center gap-2">
        <Icon size="1em" aria-hidden="true" className="shrink-0 text-sm text-pup-maroon dark:text-red-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

export function OsasSheetInfoRow({ icon: Icon, label, value, children }) {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-1 py-1.5 text-xs sm:grid-cols-[10rem_minmax(0,1fr)]">
      <dt className="flex min-w-0 items-start gap-2 font-medium text-gray-500 dark:text-zinc-400">
        <Icon size={14} aria-hidden="true" className="mt-px shrink-0 text-gray-400 dark:text-zinc-500" />
        <span className="min-w-0">{label}</span>
        <span aria-hidden="true" className="ml-auto w-3 shrink-0 select-none text-gray-300 dark:text-zinc-600">:</span>
      </dt>
      <dd className="min-w-0 wrap-anywhere font-semibold text-gray-900 dark:text-zinc-100">
        {children ?? (value || "N/A")}
      </dd>
    </div>
  );
}

export function OsasSheetSummaryBadge({ icon: Icon, children }) {
  return (
    <Badge variant="gray" size="compact" className="gap-1.5 pl-0.5 tabular-nums">
      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-black/[0.06] dark:bg-white/10">
        <Icon size={10} aria-hidden="true" />
      </span>
      {children}
    </Badge>
  );
}

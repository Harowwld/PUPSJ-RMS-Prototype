"use client";

import { ArrowDown01Icon } from "hugeicons-react";
import { cn } from "@/lib/utils";

const surface = "border-b border-border/70 bg-gray-50/80 dark:border-white/10 dark:bg-zinc-900/60";
const layout = "flex min-h-11 w-full min-w-0 items-center gap-2.5 px-5 text-left sm:px-6";

export default function DataGroupHeader({ label, count, colSpan, id, controls, collapsed, onToggle, sticky = false, leading }) {
  const content = (
    <>
      {onToggle && (
        <ArrowDown01Icon size={14} aria-hidden="true" className={cn(
          "shrink-0 text-gray-500 motion-safe:transition-transform dark:text-zinc-400",
          collapsed && "-rotate-90",
        )} />
      )}
      {leading}
      <span className="truncate text-xs font-semibold text-gray-900 dark:text-zinc-100" title={typeof label === "string" ? label : undefined}>{label}</span>
      <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-gray-600 dark:bg-white/10 dark:text-zinc-300">{count}</span>
    </>
  );

  if (colSpan != null) {
    return (
      <tr data-group-header>
        <th colSpan={colSpan} className={cn(surface, "p-0", sticky && "sticky left-0")}>
          <div className={layout}>{content}</div>
        </th>
      </tr>
    );
  }

  return (
    <h3 id={id} data-group-header className={cn(surface, sticky && "sticky top-0 z-10 backdrop-blur-xs")}>
      {onToggle ? (
        <button type="button" aria-label={`${label}, ${count}`} aria-controls={controls} aria-expanded={!collapsed} onClick={onToggle}
          className={cn(layout, "cursor-pointer transition-colors hover:bg-gray-100/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-pup-maroon dark:hover:bg-zinc-800/80")}>
          {content}
        </button>
      ) : <span className={layout}>{content}</span>}
    </h3>
  );
}

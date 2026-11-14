"use client";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

export const KANBAN_CARD_CLASS =
  "kanban-card group relative flex h-42 shrink-0 flex-col gap-1.5 select-none rounded-xl border border-gray-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:-translate-y-px hover:border-gray-300 hover:shadow-md active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10 dark:bg-zinc-900 dark:hover:border-zinc-700 motion-reduce:transform-none motion-reduce:transition-none";
export const KANBAN_CARD_DRAGGING_CLASS = "opacity-35 scale-[0.98] border-dashed border-gray-400";
export const KANBAN_CARD_HEADER_CLASS = "flex h-9 shrink-0 items-start justify-between gap-2.5";
export const KANBAN_CARD_TITLE_CLASS = "line-clamp-2 wrap-anywhere text-[13px] font-semibold leading-snug text-gray-900 dark:text-zinc-100";
export const KANBAN_CARD_METADATA_CLASS = "flex min-w-0 items-center gap-1.5 pl-5.5";
export const KANBAN_CARD_FOOTER_CLASS = "mt-auto flex min-w-0 items-center justify-between gap-2 text-[11px] text-gray-400 dark:text-zinc-500";

export function KanbanCardTag({ label }) {
  if (!label) return null;
  return (
    <Badge variant="gray" size="compact" className="min-w-0 shrink" title={label}>
      <span className="truncate">{label}</span>
    </Badge>
  );
}

const AVATAR_PALETTE = [
  "bg-emerald-600 text-white dark:bg-emerald-500/90 dark:text-zinc-950",
  "bg-sky-600 text-white dark:bg-sky-500/90 dark:text-zinc-950",
  "bg-amber-600 text-white dark:bg-amber-500/90 dark:text-zinc-950",
  "bg-rose-600 text-white dark:bg-rose-500/90 dark:text-zinc-950",
  "bg-teal-600 text-white dark:bg-teal-500/90 dark:text-zinc-950",
  "bg-slate-600 text-white dark:bg-zinc-600 dark:text-zinc-100",
];

function hashLabel(str = "") {
  let hash = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getMiniAvatarColor(label = "") {
  if (!label) return AVATAR_PALETTE[5];
  return AVATAR_PALETTE[hashLabel(label) % AVATAR_PALETTE.length];
}

export function getInitials(label = "") {
  const cleaned = String(label || "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim();
  if (!cleaned) return "—";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

/**
 * Apple/Linear-inspired 14px SVG status icon for column headers and card titles.
 */
export function KanbanStatusIcon({ status = "Pending", className }) {
  const key = String(status || "Pending").trim();

  // 1. Queued / Dashed Circle (Pending, Todo, PendingPayment)
  if (key === "Pending" || key === "PendingPayment") {
    const colorClass =
      key === "PendingPayment"
        ? "text-amber-500 dark:text-amber-400"
        : "text-gray-400 dark:text-zinc-500";
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className={cn("size-3.5 shrink-0", colorClass, className)}
      >
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="2.2 2.4"
        />
      </svg>
    );
  }

  // 2. Backlog / Submitted (Clean hollow circle)
  if (key === "Submitted") {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className={cn("size-3.5 shrink-0 text-gray-400 dark:text-zinc-500", className)}
      >
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  // 3. In Progress / Under Review (Half-filled progress circle)
  if (key === "InProgress" || key === "In Progress" || key === "Under Review") {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className={cn("size-3.5 shrink-0 text-sky-500 dark:text-sky-400", className)}
      >
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 2a6 6 0 0 0 0 12V2Z" fill="currentColor" />
      </svg>
    );
  }

  // 4. Needs Revision / Deficient (Warning dot inside dashed/solid circle)
  if (key === "Needs Revision" || key === "Deficient") {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className={cn("size-3.5 shrink-0 text-amber-500 dark:text-amber-400", className)}
      >
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2.4 2.2"
        />
        <circle cx="8" cy="8" r="2.2" fill="currentColor" />
      </svg>
    );
  }

  // 5. Ready (Three-quarter / ring-dot emerald circle)
  if (key === "Ready") {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className={cn("size-3.5 shrink-0 text-emerald-500 dark:text-emerald-400", className)}
      >
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="8" r="3" fill="currentColor" />
      </svg>
    );
  }

  // 6. Approved / Completed / Cleared (Checkmark circle)
  if (key === "Approved" || key === "Completed" || key === "Cleared") {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className={cn("size-3.5 shrink-0 text-emerald-500 dark:text-emerald-400", className)}
      >
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M5.5 8.2 7.2 9.9 10.6 6.3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // 7. Declined / Cancelled / Shredded (Cross circle)
  if (key === "Declined" || key === "Cancelled" || key === "Shredded") {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className={cn("size-3.5 shrink-0 text-rose-500 dark:text-rose-400", className)}
      >
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M6 6l4 4M10 6l-4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn("size-3.5 shrink-0 text-gray-400 dark:text-zinc-500", className)}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Inspiration-matched compact square initials badge for card footers.
 */
export function KanbanMiniAvatar({ name, code, className }) {
  const initials = code ? String(code).slice(0, 2).toUpperCase() : getInitials(name);
  const color = getMiniAvatarColor(code || name);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center size-4 rounded-[4px] text-[9px] font-bold tracking-tight shrink-0 tabular-nums",
        color,
        className
      )}
    >
      {initials}
    </span>
  );
}

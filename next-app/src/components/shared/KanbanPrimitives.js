"use client";

import { cn } from "@/lib/utils";

const DOT_PALETTE = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-blue-500",
  "bg-orange-500",
  "bg-cyan-500",
];

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

export function getTagDotColor(label = "") {
  if (!label) return DOT_PALETTE[0];
  return DOT_PALETTE[hashLabel(label) % DOT_PALETTE.length];
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
 * Inspiration-matched tag pill with a small colored dot on the left.
 */
export function KanbanDotTag({ label, dotColor, className, title }) {
  if (!label) return null;
  const resolvedDot = dotColor || getTagDotColor(label);
  return (
    <span
      title={title || label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-zinc-800/70 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:text-zinc-300 max-w-full",
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", resolvedDot)} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
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

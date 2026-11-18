"use client";

import { PlusSignIcon } from "hugeicons-react";
import { cn } from "@/lib/utils";

/**
 * Renders one or more keyboard keycaps separated by a plus icon when
 * multiple keys are combined.
 */
export default function KeyboardShortcutKeys({
  keys = [],
  size = "sm",
  kbdClassName,
  className,
  ariaLabel,
}) {
  if (!Array.isArray(keys) || keys.length === 0) return null;
  const label = ariaLabel || keys.join(" + ");
  const isCompact = size === "xs";

  return (
    <span
      className={cn("inline-flex items-center gap-1 shrink-0 select-none", className)}
      aria-label={label}
    >
      {keys.map((keyLabel, idx) => (
        <span key={`${keyLabel}-${idx}`} className="inline-flex items-center gap-1">
          {idx > 0 && (
            <PlusSignIcon
              size={isCompact ? 9 : 10}
              aria-hidden="true"
              className="text-gray-400 dark:text-zinc-500 shrink-0"
            />
          )}
          <kbd
            className={cn(
              "inline-flex items-center justify-center border border-black/[0.08] dark:border-white/[0.12] bg-gray-50 dark:bg-zinc-900 font-sans font-semibold text-gray-700 dark:text-zinc-200 shadow-2xs leading-none tabular-nums",
              isCompact
                ? "min-w-5 h-5 px-1.5 rounded-md text-[9.5px]"
                : "min-w-6 px-2 py-0.5 rounded-lg text-[11px]",
              kbdClassName
            )}
          >
            {keyLabel}
          </kbd>
        </span>
      ))}
    </span>
  );
}

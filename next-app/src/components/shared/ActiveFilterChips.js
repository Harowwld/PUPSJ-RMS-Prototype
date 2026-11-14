"use client";
import { BADGE_BASE } from "@/lib/badgeStyles";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppReducedMotion, SPRING_LAYOUT, EASE_OUT } from "@/lib/motion";
import {
  Cancel01Icon,
  FilterIcon,
  Search01Icon,
  Calendar01Icon,
} from "hugeicons-react";

/**
 * Helper to determine Apple-style contextual icon for filter tokens
 */
function getChipIcon(chip, groupLabel, label) {
  const combined = `${chip.type || ""} ${groupLabel || ""} ${label || ""}`.toLowerCase();

  if (combined.includes("search")) {
    return <Search01Icon size={12} aria-hidden="true" className="shrink-0 text-gray-400 dark:text-zinc-500" />;
  }

  if (combined.includes("date") || combined.includes("range") || combined.includes("→") || combined.includes("created")) {
    return <Calendar01Icon size={12} aria-hidden="true" className="shrink-0 text-pup-maroon dark:text-red-400" />;
  }

  return <FilterIcon size={11} aria-hidden="true" className="shrink-0 text-gray-400 dark:text-zinc-500" />;
}

/**
 * ActiveFilterChips
 * Apple-styled filter token strip.
 * Renders lightweight, fluid capsules with clear category scopes, contextual icons,
 * micro-dismiss targets, and a clean "Clear all" action.
 *
 * @param {Array} chips - Direct chip descriptors [{ id, label, groupLabel, onRemove }]
 * @param {Array} groups - [{ id: "status", label: "Status", options: [{ value, label }] }]
 * @param {Object} selected - { status: ["pending"], category: ["admission"] }
 * @param {Function} onRemove - (groupId, value) => void
 * @param {Function} onClearAll - () => void
 * @param {string} searchQuery - Optional search string
 * @param {Function} onClearSearch - Optional callback to clear search
 * @param {Array} extraChips - Extra chips [{ key, label, groupLabel, onRemove, onClear }]
 * @param {string} className - Optional container styling
 */
export default function ActiveFilterChips({
  chips: passedChips,
  groups = [],
  selected = {},
  onRemove,
  onClearAll,
  searchQuery = "",
  onClearSearch,
  extraChips = [],
  className,
}) {
  const shouldReduceMotion = useAppReducedMotion();
  // Collect all active chip items
  const chips = [];

  if (Array.isArray(passedChips) && passedChips.length > 0) {
    passedChips.forEach((c, idx) => {
      if (!c) return;
      chips.push({
        type: "direct",
        groupId: c.id || idx,
        groupLabel: c.groupLabel,
        label: c.label,
        onClear: c.onRemove || c.onClear,
      });
    });
  }

  if (searchQuery && searchQuery.trim().length > 0) {
    chips.push({
      type: "search",
      groupLabel: "Search",
      label: `"${searchQuery.trim()}"`,
      onClear: onClearSearch,
    });
  }

  (extraChips || []).forEach((extra, idx) => {
    if (extra && extra.label) {
      chips.push({
        type: `extra-${idx}`,
        groupLabel: extra.groupLabel,
        label: extra.label,
        onClear: extra.onClear || extra.onRemove,
      });
    }
  });

  groups.forEach((group) => {
    const selectedVals = group.values || selected?.[group.id] || [];
    selectedVals.forEach((val) => {
      const opt = group.options?.find((o) => String(o.value) === String(val));
      const label = group.formatValue ? group.formatValue(val) : (opt?.label || String(val));
      chips.push({
        type: "filter",
        groupId: group.id || group.key,
        value: val,
        groupLabel: group.label,
        label,
        onClear: () => {
          if (typeof group.onRemove === "function") {
            group.onRemove(val);
          } else if (typeof onRemove === "function") {
            onRemove(group.id || group.key, val);
          }
        },
      });
    });
  });

  if (chips.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Active filters"
      className={cn(
        "flex flex-wrap items-center gap-1.5 px-5 py-2 border-t border-border/80 dark:border-border/60 bg-gray-50/50 dark:bg-zinc-900/40 animate-in fade-in-50 duration-150",
        className
      )}
    >
      {/* Apple-style Filter Counter Badge */}
      <div className="flex items-center gap-1.5 select-none mr-1 shrink-0">
        <span className="text-[11px] font-medium tracking-normal text-gray-500 dark:text-zinc-400">
          Filters
        </span>
        <span className={cn("bg-gray-200/70 dark:bg-zinc-800 tabular-nums text-gray-600 dark:text-zinc-300", BADGE_BASE)}>
          {chips.length}
        </span>
      </div>

      {/* Filter Tokens */}
      <AnimatePresence mode="popLayout">
        {chips.map((chip, idx) => {
          let displayGroupLabel = chip.groupLabel;
          let displayLabel = chip.label;

          // Auto-split strings like "Range: Oct 1 - Oct 31" into GroupLabel + Label if not already separated
          if (!displayGroupLabel && typeof displayLabel === "string") {
            const colonIndex = displayLabel.indexOf(": ");
            if (colonIndex > 0 && colonIndex < 20) {
              displayGroupLabel = displayLabel.slice(0, colonIndex).trim();
              displayLabel = displayLabel.slice(colonIndex + 2).trim();
            }
          }

          const icon = getChipIcon(chip, displayGroupLabel, displayLabel);

          return (
            <motion.span
              layout={!shouldReduceMotion}
              key={`${chip.type}-${chip.groupId || ""}-${chip.value || idx}`}
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      scale: 0.85,
                      transition: { duration: 0.14, ease: EASE_OUT },
                    }
              }
              transition={shouldReduceMotion ? { duration: 0 } : SPRING_LAYOUT}
              className="inline-flex items-center gap-1.5 h-6.5 pl-2.5 pr-1 rounded-full bg-white dark:bg-zinc-800 border border-black/[0.08] dark:border-white/[0.12] text-gray-700 dark:text-zinc-200 text-xs font-normal shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-none transition-colors hover:border-black/[0.16] dark:hover:border-white/20 select-none active:scale-[0.98]"
            >
              {icon}

              {displayGroupLabel && (
                <>
                  <span className="text-[11px] font-normal text-gray-500 dark:text-zinc-400 truncate max-w-[120px]">
                    {displayGroupLabel}
                  </span>
                  <span className="text-gray-300 dark:text-zinc-600 select-none text-[10px]" aria-hidden="true">
                    ·
                  </span>
                </>
              )}

              <span className="font-medium text-[11px] text-gray-900 dark:text-zinc-100 max-w-[220px] truncate">
                {displayLabel}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  chip.onClear?.();
                }}
                className="w-4 h-4 ml-0.5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-700/80 active:scale-90 transition-all cursor-pointer"
                aria-label={`Remove filter: ${displayGroupLabel ? `${displayGroupLabel} ` : ""}${displayLabel}`}
              >
                <Cancel01Icon size={10} className="shrink-0" />
              </button>
            </motion.span>
          );
        })}
      </AnimatePresence>

      {/* Clear All Action */}
      {chips.length > 0 && onClearAll && (
        <div className="flex items-center ml-0.5 shrink-0">
          <div className="h-3 w-px bg-gray-200 dark:bg-zinc-800 mx-1" aria-hidden="true" />
          <button
            type="button"
            onClick={onClearAll}
            title="Clear all active filters"
            className="inline-flex items-center h-6 px-2 rounded-lg text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer select-none"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import { cn } from "@/lib/utils";

/**
 * ActiveFilterChips
 * Renders dismissible chips for currently applied multi-criteria filters,
 * optional search queries, and a "Clear all" button.
 *
 * @param {Array} groups - [{ id: "status", label: "Status", options: [{ value, label }] }]
 * @param {Object} selected - { status: ["pending"], category: ["admission"] }
 * @param {Function} onRemove - (groupId, value) => void
 * @param {Function} onClearAll - () => void
 * @param {string} searchQuery - Optional search string
 * @param {Function} onClearSearch - Optional callback to clear search
 * @param {string} className - Optional container styling
 */
export default function ActiveFilterChips({
  groups = [],
  selected = {},
  onRemove,
  onClearAll,
  searchQuery = "",
  onClearSearch,
  extraChips = [],
  className,
}) {
  // Collect all active chip items
  const chips = [];

  if (searchQuery && searchQuery.trim().length > 0) {
    chips.push({
      type: "search",
      label: `Search: "${searchQuery.trim()}"`,
      onClear: onClearSearch,
    });
  }

  (extraChips || []).forEach((extra, idx) => {
    if (extra && extra.label) {
      chips.push({
        type: `extra-${idx}`,
        groupLabel: extra.groupLabel,
        label: extra.label,
        onClear: extra.onClear,
      });
    }
  });

  groups.forEach((group) => {
    const selectedVals = selected?.[group.id] || [];
    selectedVals.forEach((val) => {
      const opt = group.options?.find((o) => String(o.value) === String(val));
      const label = opt?.label || String(val);
      chips.push({
        type: "filter",
        groupId: group.id,
        value: val,
        groupLabel: group.label,
        label,
        onClear: () => onRemove && onRemove(group.id, val),
      });
    });
  });

  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 pt-1.5 animate-in fade-in-50 duration-200",
        className
      )}
    >
      <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500 mr-1 select-none">
        Active Filters:
      </span>

      {chips.map((chip, idx) => (
        <span
          key={`${chip.type}-${chip.groupId || ""}-${chip.value || idx}`}
          className="inline-flex items-center gap-1.5 h-6 pl-2 pr-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200/70 dark:border-white/10 text-[11px] font-medium transition-all hover:border-gray-300 dark:hover:border-white/20 select-none shadow-2xs"
        >
          {chip.groupLabel && (
            <span className="text-gray-400 dark:text-zinc-500 font-normal">
              {chip.groupLabel}:
            </span>
          )}
          <span className="font-semibold text-gray-800 dark:text-zinc-100 max-w-[160px] truncate">
            {chip.label}
          </span>
          <button
            type="button"
            onClick={chip.onClear}
            className="w-4 h-4 rounded flex items-center justify-center text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer ml-0.5"
            aria-label={`Remove filter ${chip.label}`}
          >
            <HugeIcon className="ph-bold ph-x text-[10px]" />
          </button>
        </span>
      ))}

      {chips.length > 1 && onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] font-medium text-pup-maroon hover:text-pup-darkMaroon dark:text-red-400 dark:hover:text-red-300 hover:underline cursor-pointer ml-1 py-0.5 px-1.5 transition-colors select-none"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

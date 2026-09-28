"use client";

import React, { useMemo } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * MultiCriteriaFilter
 * Unified Apple HIG-compliant multi-criteria checkbox popover filter.
 */
export default function MultiCriteriaFilter({
  title,
  buttonLabel,
  groups = [],
  selected,
  selectedValues,
  onChange,
  totalCount,
  matchingCount,
  filteredCount,
  onReset,
  onClearAll,
  align = "end",
  className,
  triggerClassName,
}) {
  const displayTitle = buttonLabel || title || "Filter Records";
  const effectiveMatching = filteredCount !== undefined ? filteredCount : matchingCount;

  // Resolve current selection map across both object-based and per-group APIs
  const effectiveSelected = useMemo(() => {
    const map = { ...(selectedValues || selected || {}) };
    groups.forEach((g) => {
      if (Array.isArray(g.selected)) {
        map[g.id] = g.selected;
      }
    });
    return map;
  }, [selected, selectedValues, groups]);

  // Count total active criteria
  const activeCount = useMemo(() => {
    return Object.values(effectiveSelected).reduce((acc, curr) => {
      return acc + (Array.isArray(curr) ? curr.length : 0);
    }, 0);
  }, [effectiveSelected]);

  // Compute trigger summary label
  const triggerLabel = useMemo(() => {
    if (activeCount === 0) return displayTitle;

    // Single active criterion: find its display label
    if (activeCount === 1) {
      for (const group of groups) {
        const selectedInGroup = effectiveSelected[group.id];
        if (Array.isArray(selectedInGroup) && selectedInGroup.length === 1) {
          const opt = group.options?.find(
            (o) => String(o.value ?? o.id) === String(selectedInGroup[0])
          );
          if (opt?.label) return opt.label;
        }
      }
    }

    // Single group with multiple items: return group label (count is in the badge)
    const activeGroups = groups.filter((g) => (effectiveSelected[g.id]?.length || 0) > 0);
    if (activeGroups.length === 1) {
      return activeGroups[0].label;
    }

    // Multiple groups active: return base title (count is in the badge)
    return displayTitle;
  }, [activeCount, displayTitle, groups, effectiveSelected]);

  const toggleOption = (group, rawVal) => {
    const currentList = effectiveSelected[group.id] || [];
    const exists = currentList.includes(rawVal);
    const updatedList = exists
      ? currentList.filter((v) => v !== rawVal)
      : [...currentList, rawVal];

    if (typeof group.onChange === "function") {
      group.onChange(updatedList);
    } else if (typeof onChange === "function") {
      if (selectedValues !== undefined) {
        onChange(group.id, updatedList);
      } else {
        onChange({
          ...effectiveSelected,
          [group.id]: updatedList,
        });
      }
    }
  };

  const handleResetAll = () => {
    if (typeof onClearAll === "function") {
      onClearAll();
      return;
    }
    if (typeof onReset === "function") {
      onReset();
      return;
    }

    let hasGroupHandlers = false;
    groups.forEach((g) => {
      if (typeof g.onChange === "function") {
        hasGroupHandlers = true;
        g.onChange([]);
      }
    });

    if (!hasGroupHandlers && typeof onChange === "function") {
      if (selectedValues !== undefined) {
        groups.forEach((g) => onChange(g.id, []));
      } else {
        const cleared = {};
        groups.forEach((g) => {
          cleared[g.id] = [];
        });
        onChange(cleared);
      }
    }
  };

  return (
    <div className={cn("w-full sm:w-auto", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            type="button"
            className={cn(
              "h-9 px-3 text-xs rounded-xl border flex items-center justify-between gap-2 shadow-none cursor-pointer transition-all active:scale-95 w-full sm:w-auto min-w-[180px]",
              activeCount > 0
                ? "border-pup-maroon/40 bg-pup-maroon/5 text-pup-maroon font-medium hover:bg-pup-maroon/10 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                : "border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700",
              triggerClassName
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <HugeIcon
                className={cn(
                  "ph-bold text-xs shrink-0",
                  activeCount > 0
                    ? "ph-funnel-simple text-pup-maroon dark:text-red-400"
                    : "ph-funnel text-gray-400 dark:text-zinc-500"
                )}
              />
              <span className="truncate">{triggerLabel}</span>
              {activeCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-pup-maroon px-1 text-[10px] font-bold text-white dark:bg-red-500">
                  {activeCount}
                </span>
              )}
            </div>
            <HugeIcon className="ph-bold ph-caret-down text-[10px] text-gray-400 dark:text-zinc-500 shrink-0 ml-1" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align={align}
          sideOffset={6}
          className="w-72 sm:w-80 rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-zinc-900 overflow-hidden font-jakarta"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10 bg-gray-50/60 dark:bg-zinc-800/40">
            <div className="flex items-center gap-2">
              <HugeIcon className="ph-bold ph-faders text-xs text-gray-500 dark:text-zinc-400" />
              <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                Combine Filter Criteria
              </span>
            </div>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleResetAll}
                className="text-[11px] font-semibold text-pup-maroon dark:text-red-400 hover:underline cursor-pointer"
              >
                Reset all
              </button>
            )}
          </div>

          {/* Filter Groups List */}
          <div className="max-h-72 overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
            {groups.map((group, groupIdx) => {
              const selectedInGroup = effectiveSelected[group.id] || [];

              return (
                <div
                  key={group.id}
                  className={cn(groupIdx > 0 && "pt-3 border-t border-gray-100 dark:border-white/5")}
                >
                  <div className="flex items-center justify-between px-1 mb-1.5">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                      {group.label}
                    </span>
                    {selectedInGroup.length > 0 && (
                      <span className="text-[10px] font-semibold text-pup-maroon dark:text-red-400">
                        {selectedInGroup.length} selected
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {group.options?.map((opt) => {
                      const optValue = opt.value ?? opt.id;
                      const isChecked = selectedInGroup.includes(optValue);
                      const dot = opt.dotColor || opt.indicatorColor;

                      return (
                        <div
                          key={String(optValue)}
                          onClick={() => toggleOption(group, optValue)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100/70 dark:hover:bg-white/5 cursor-pointer select-none transition-colors group/item"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all shrink-0",
                                isChecked
                                  ? "bg-pup-maroon border-pup-maroon text-white dark:bg-red-600 dark:border-red-600"
                                  : "border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 group-hover/item:border-gray-400"
                              )}
                            >
                              {isChecked && (
                                <HugeIcon className="ph-bold ph-check text-[10px]" />
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 min-w-0">
                              {dot && (
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
                              )}
                              <span className="text-xs font-medium text-gray-800 dark:text-zinc-200 truncate">
                                {opt.label}
                              </span>
                            </div>
                          </div>

                          {opt.count !== undefined && (
                            <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 tabular-nums shrink-0 ml-2">
                              {opt.count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Popover Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/10 bg-gray-50/60 dark:bg-zinc-800/40 flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-zinc-400 text-[11px]">
              {effectiveMatching !== undefined && totalCount !== undefined ? (
                <>
                  Matching: <strong className="text-gray-900 dark:text-zinc-100">{effectiveMatching}</strong> of {totalCount}
                </>
              ) : (
                "Combined criteria"
              )}
            </span>
            {activeCount > 0 && (
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                Combined active
              </span>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

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
  headerTitle,
  groups = [],
  selected,
  selectedValues,
  onChange,
  onReset,
  onClearAll,
  align = "end",
  className,
  triggerClassName,
  contentClassName,
}) {
  const displayTitle = buttonLabel || title || "Filter Records";

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

  // Size the popover to its longest option label (text-xs ~6.6px/char plus row chrome),
  // clamped between the compact 208px minimum and a 384px maximum.
  const popoverWidth = useMemo(() => {
    let longest = 0;
    groups.forEach((g) => {
      longest = Math.max(longest, String(g.label || "").length * 0.9);
      g.options?.forEach((o) => {
        const len = String(o.label ?? "").length + (o.count !== undefined ? String(o.count).length + 2 : 0);
        if (len > longest) longest = len;
      });
    });
    return Math.min(384, Math.max(208, Math.ceil(longest * 6.6 + 96)));
  }, [groups]);

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
                : "border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700",
              triggerClassName
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate">{triggerLabel}</span>
              {activeCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-pup-maroon px-1 text-[10px] font-semibold text-white dark:bg-red-500">
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
          style={{ width: popoverWidth, maxWidth: "calc(100vw - 1.5rem)" }}
          className={cn(
            "rounded-2xl border-[0.5px] border-border dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-0 overflow-hidden font-jakarta select-none z-50",
            contentClassName
          )}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b-[0.5px] border-border dark:border-white/10 bg-gray-50/60 dark:bg-zinc-800/40">
            <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
              {headerTitle || title || "Filter Records"}
            </span>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleResetAll}
                title="Reset all filter criteria"
                className="text-[11px] font-semibold text-pup-maroon dark:text-red-400 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Filter Groups List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
            {groups.map((group, groupIdx) => {
              const selectedInGroup = effectiveSelected[group.id] || [];

              return (
                <div
                  key={group.id}
                  className={cn(groupIdx > 0 && "pt-2 border-t-[0.5px] border-border/70 dark:border-white/10")}
                >
                  <div className="flex items-center justify-between px-1.5 mb-1">
                    <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                      {group.label}
                    </span>
                    {selectedInGroup.length > 0 && (
                      <span className="text-[10px] font-semibold text-pup-maroon dark:text-red-400">
                        {selectedInGroup.length} selected
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {group.options?.map((opt) => {
                      const optValue = opt.value ?? opt.id;
                      const isChecked = selectedInGroup.includes(optValue);
                      const dot = opt.dotColor || opt.indicatorColor;

                      return (
                        <div
                          key={String(optValue)}
                          onClick={() => toggleOption(group, optValue)}
                          className={cn(
                            "flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer select-none transition-colors group/item",
                            isChecked
                              ? "bg-pup-maroon/5 text-pup-maroon dark:bg-red-500/10 dark:text-red-400 font-medium"
                              : "text-gray-700 dark:text-zinc-200 hover:bg-gray-100/80 dark:hover:bg-zinc-800"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={cn(
                                "w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center transition-all shrink-0",
                                isChecked
                                  ? "bg-pup-maroon border-pup-maroon text-white dark:bg-red-600 dark:border-red-600"
                                  : "border-border dark:border-border bg-white dark:bg-zinc-800 group-hover/item:border-gray-400"
                              )}
                            >
                              {isChecked && (
                                <HugeIcon className="ph-bold ph-check text-[9px]" />
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 min-w-0">
                              {dot && (
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
                              )}
                              <span className="text-xs font-medium truncate">
                                {opt.label}
                              </span>
                            </div>
                          </div>

                          {opt.count !== undefined && (
                            <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500 tabular-nums shrink-0 ml-1.5">
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

        </PopoverContent>
      </Popover>
    </div>
  );
}

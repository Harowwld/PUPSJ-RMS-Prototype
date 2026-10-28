"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import HugeIcon from "@/components/shared/HugeIcon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Standardized horizontal scroll controls for data tables.
 * Perfectly matches the design and behavior in DocumentsTab.js.
 */
export default function TableScrollControls({
  isScrolledX: propIsScrolledX,
  isScrolled: propIsScrolled,
  onResetScroll,
  onScrollLeft,
  onScrollRight,
  className,
  label = "Scroll columns:",
}) {
  const isScrolledX = propIsScrolledX ?? propIsScrolled ?? false;

  const handleScrollLeft = (e) => {
    e?.preventDefault?.();
    if (typeof onScrollLeft === "function") {
      onScrollLeft(400);
    }
  };

  const handleScrollRight = (e) => {
    e?.preventDefault?.();
    if (typeof onScrollRight === "function") {
      onScrollRight(400);
    }
  };

  const handleResetScroll = (e) => {
    e?.preventDefault?.();
    if (typeof onResetScroll === "function") {
      onResetScroll();
    }
  };

  return (
    <div className={cn("flex items-center gap-2 shrink-0 select-none", className)}>
      {label && (
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-zinc-500 mr-1">
          <HugeIcon className="ph-bold ph-arrows-left-right text-xs text-pup-maroon dark:text-red-400" />
          <span>{label}</span>
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={handleResetScroll}
        disabled={!isScrolledX}
        className="h-8 px-2.5 gap-1.5 text-xs font-semibold rounded-xl border border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        title="Reset horizontal scroll to default"
      >
        <HugeIcon className="ph-bold ph-arrow-counter-clockwise text-xs" />
        <span>Reset Scroll</span>
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleScrollLeft}
            className="w-8 h-8 rounded-xl border border-border bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95"
            aria-label="Scroll table left"
          >
            <HugeIcon className="ph-bold ph-caret-left text-xs" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Scroll Left</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleScrollRight}
            className="w-8 h-8 rounded-xl border border-border bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95"
            aria-label="Scroll table right"
          >
            <HugeIcon className="ph-bold ph-caret-right text-xs" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Scroll Right</TooltipContent>
      </Tooltip>
    </div>
  );
}

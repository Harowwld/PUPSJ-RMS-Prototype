"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArrowLeft01Icon, ArrowRight01Icon, ReloadIcon } from "hugeicons-react";


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
  scrollContainerRef,
  canScrollLeft,
  canScrollRight,
  className,
  controlSize = "md",
  scrollTargetLabel = "table",
}) {
  const isScrolledX = propIsScrolledX ?? propIsScrolled ?? false;
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollBackward, setCanScrollBackward] = useState(Boolean(canScrollLeft));
  const [canScrollForward, setCanScrollForward] = useState(Boolean(canScrollRight));

  useEffect(() => {
    if (!scrollContainerRef) {
      setHasOverflow(Boolean(canScrollLeft || canScrollRight));
      setCanScrollBackward(Boolean(canScrollLeft));
      setCanScrollForward(Boolean(canScrollRight));
      return;
    }
    let observedElement = null;
    let resizeObserver = null;
    const checkOverflow = () => {
      const element = observedElement;
      if (!element) return;
      const maxScroll = element.scrollWidth - element.clientWidth;
      setHasOverflow(maxScroll > 5);
      setCanScrollBackward(element.scrollLeft > 5);
      setCanScrollForward(maxScroll - element.scrollLeft > 5);
    };
    const attachCurrentElement = () => {
      const nextElement = scrollContainerRef.current;
      if (nextElement === observedElement) {
        checkOverflow();
        return;
      }
      observedElement?.removeEventListener("scroll", checkOverflow);
      resizeObserver?.disconnect();
      observedElement = nextElement;
      if (!observedElement) {
        setHasOverflow(false);
        setCanScrollBackward(false);
        setCanScrollForward(false);
        return;
      }
      observedElement.addEventListener("scroll", checkOverflow, { passive: true });
      resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => checkOverflow()) : null;
      resizeObserver?.observe(observedElement);
      checkOverflow();
    };
    attachCurrentElement();
    const mutationObserver = typeof MutationObserver !== "undefined" && document.body
      ? new MutationObserver(attachCurrentElement)
      : null;
    mutationObserver?.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", checkOverflow, { passive: true });
    return () => {
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      observedElement?.removeEventListener("scroll", checkOverflow);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [scrollContainerRef, canScrollLeft, canScrollRight]);

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

  if (!hasOverflow) return null;

  return (
    <div data-slot="table-scroll-controls" className={cn("flex max-w-full flex-nowrap items-center gap-2 shrink-0 select-none", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={handleResetScroll}
        disabled={!isScrolledX}
        className={cn(controlSize === "md" ? "h-9" : "h-8", "px-2.5 gap-1.5 text-xs font-semibold rounded-xl border border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all")}
        title="Reset horizontal scroll to default"
      >
        <ReloadIcon size="1em" className="text-xs" />
        <span>Reset Scroll</span>
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleScrollLeft}
            disabled={scrollContainerRef ? !canScrollBackward : canScrollLeft === false}
            className={cn("rounded-xl border border-border bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95", controlSize === "md" ? "h-9 w-9" : "h-8 w-8")}
            aria-label={`Scroll ${scrollTargetLabel} left`}
          >
            <ArrowLeft01Icon size="1em" className="text-xs" />
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
            disabled={scrollContainerRef ? !canScrollForward : canScrollRight === false}
            className={cn("rounded-xl border border-border bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95", controlSize === "md" ? "h-9 w-9" : "h-8 w-8")}
            aria-label={`Scroll ${scrollTargetLabel} right`}
          >
            <ArrowRight01Icon size="1em" className="text-xs" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Scroll Right</TooltipContent>
      </Tooltip>
    </div>
  );
}

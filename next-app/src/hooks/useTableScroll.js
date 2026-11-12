"use client";
import { useState, useRef, useEffect, useCallback } from "react";

export function moveTableScroll(viewport, amount) {
  const prefersReducedMotion =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  const behavior = prefersReducedMotion ? "instant" : "smooth";
  if (amount === undefined) viewport?.scrollTo({ left: 0, behavior });
  else viewport?.scrollBy({ left: amount, behavior });
}

/**
 * Hook to manage horizontal scroll state and smooth scrolling for wide data tables.
 * Follows the pattern established in DocumentsTab.js.
 */
export function useTableScroll(dependencies = []) {
  const containerRef = useRef(null);
  const [isScrolledX, setIsScrolledX] = useState(false);
  const [canScroll, setCanScroll] = useState(false);

  const depsRef = useRef(dependencies);
  useEffect(() => {
    depsRef.current = dependencies;
  });

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setIsScrolledX(el.scrollLeft > 20);
    setCanScroll(el.scrollWidth > el.clientWidth + 5);
  }, []);

  // Loading states and view switches can replace the viewport after the first render.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });

    checkScroll();
    const rId = requestAnimationFrame(checkScroll);

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(checkScroll);
      ro.observe(el);
      const table = el.querySelector("table");
      if (table) ro.observe(table);
    }

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      cancelAnimationFrame(rId);
      if (ro) ro.disconnect();
    };
  });

  // Re-check scroll state whenever dependencies change, safely using a single trigger effect
  const depsKey = Array.isArray(dependencies)
    ? dependencies.map((d) => (typeof d === "object" && d !== null ? JSON.stringify(d) : String(d))).join("|")
    : String(dependencies);

  useEffect(() => {
    checkScroll();
  }, [depsKey, checkScroll]);

  const scrollLeft = useCallback((amount = 400) => {
    const px = typeof amount === "number" && !isNaN(amount) ? amount : 400;
    if (containerRef.current) {
      moveTableScroll(containerRef.current, -px);
    }
  }, []);

  const scrollRight = useCallback((amount = 400) => {
    const px = typeof amount === "number" && !isNaN(amount) ? amount : 400;
    if (containerRef.current) {
      moveTableScroll(containerRef.current, px);
    }
  }, []);

  const resetScroll = useCallback(() => {
    if (containerRef.current) {
      moveTableScroll(containerRef.current);
    }
  }, []);

  const scrollTable = useCallback((direction = "right", amount = 400) => {
    if (typeof direction === "number") {
      if (containerRef.current) {
        moveTableScroll(containerRef.current, direction);
      }
      return;
    }
    const px = typeof amount === "number" && !isNaN(amount) ? amount : 400;
    if (direction === "left") {
      scrollLeft(px);
    } else {
      scrollRight(px);
    }
  }, [scrollLeft, scrollRight]);

  return {
    containerRef,
    tableContainerRef: containerRef,
    isScrolledX,
    isScrolled: isScrolledX,
    canScroll,
    canScrollLeft: isScrolledX,
    canScrollRight: canScroll,
    scrollLeft,
    scrollRight,
    scrollTable,
    resetScroll,
  };
}

export default useTableScroll;

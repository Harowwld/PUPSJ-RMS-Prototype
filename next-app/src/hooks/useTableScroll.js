"use client";
import { useState, useRef, useEffect, useCallback } from "react";

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
    }

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      cancelAnimationFrame(rId);
      if (ro) ro.disconnect();
    };
  }, [checkScroll]);

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
      containerRef.current.scrollBy({ left: -px, behavior: "smooth" });
    }
  }, []);

  const scrollRight = useCallback((amount = 400) => {
    const px = typeof amount === "number" && !isNaN(amount) ? amount : 400;
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: px, behavior: "smooth" });
    }
  }, []);

  const resetScroll = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, []);

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
    resetScroll,
  };
}

export default useTableScroll;

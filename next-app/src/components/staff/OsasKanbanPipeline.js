"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import HugeIcon from "@/components/shared/HugeIcon";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const STAGE_SUBTITLES = {
  proposals: {
    "Submitted": "Initial Intake",
    "Under Review": "Compliance Check",
    "Needs Revision": "Action Required",
    "Approved": "Officially Endorsed",
    "Declined": "Rejected / Appealed",
  },
  post_events: {
    "Submitted": "Pending Intake",
    "Under Review": "Clearance Check",
    "Needs Revision": "Revision Required",
    "Cleared": "Clearance Granted",
    "Declined": "Deficient / Rejected",
  },
};

const STAGE_THEMES = {
  "Submitted": {
    accent: "bg-slate-400 dark:bg-zinc-500",
    borderTop: "border-t-slate-400 dark:border-t-zinc-500",
    dot: "bg-slate-400 dark:bg-zinc-400",
    badge: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300",
    dropZone: "border-slate-400/60 bg-slate-50/60 dark:bg-zinc-800/40 text-slate-700 dark:text-zinc-300",
  },
  "Under Review": {
    accent: "bg-sky-500",
    borderTop: "border-t-sky-500",
    dot: "bg-sky-500",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
    dropZone: "border-sky-500/60 bg-sky-50/60 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300",
  },
  "Needs Revision": {
    accent: "bg-amber-500",
    borderTop: "border-t-amber-500",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    dropZone: "border-amber-500/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
  },
  "Approved": {
    accent: "bg-emerald-500",
    borderTop: "border-t-emerald-500",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    dropZone: "border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
  },
  "Cleared": {
    accent: "bg-emerald-500",
    borderTop: "border-t-emerald-500",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    dropZone: "border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
  },
  "Declined": {
    accent: "bg-rose-500",
    borderTop: "border-t-rose-500",
    dot: "bg-rose-500",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
    dropZone: "border-rose-500/60 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",
  },
};

export default function OsasKanbanPipeline({
  stream = "proposals", // "proposals" | "post_events"
  columns = [],
  items = [],
  onSelectItem,
  onDropItem,
  onOpenPdfPreview,
  draggingItem,
  setDraggingItem,
  dragOverColumn,
  setDragOverColumn,
  allowedTransitions = {},
  normalizeStatus = (s) => s,
  isItemLocked = () => false,
}) {
  const boardScrollRef = useRef(null);
  const columnRefs = useRef({});
  const isDraggingCardRef = useRef(false);

  // Horizontal Scroll & Slider state
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeColumnKey, setActiveColumnKey] = useState(columns[0]?.key || "");

  // Mouse pan / drag-to-scroll canvas state
  const isPanningRef = useRef(false);
  const panStartXRef = useRef(0);
  const panScrollLeftRef = useRef(0);
  const [isPanningActive, setIsPanningActive] = useState(false);

  // Group items by column
  const columnData = useMemo(() => {
    const map = {};
    columns.forEach((col) => {
      map[col.key] = [];
    });
    items.forEach((item) => {
      const normalized = normalizeStatus(item.status);
      if (map[normalized]) {
        map[normalized].push(item);
      } else {
        // Fallback for untracked status
        const firstCol = columns[0]?.key;
        if (firstCol && map[firstCol]) map[firstCol].push(item);
      }
    });
    return map;
  }, [columns, items, normalizeStatus]);

  // Update scroll bounds
  const updateScrollBounds = useCallback(() => {
    const el = boardScrollRef.current;
    if (!el) return;
    const hasLeft = el.scrollLeft > 12;
    const hasRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 12;
    setCanScrollLeft(hasLeft);
    setCanScrollRight(hasRight);

    // Detect currently visible primary column
    const scrollCenter = el.scrollLeft + el.clientWidth / 2;
    let closestKey = columns[0]?.key || "";
    let minDistance = Infinity;

    columns.forEach((col) => {
      const colEl = columnRefs.current[col.key];
      if (colEl) {
        const colCenter = colEl.offsetLeft + colEl.offsetWidth / 2;
        const dist = Math.abs(colCenter - scrollCenter);
        if (dist < minDistance) {
          minDistance = dist;
          closestKey = col.key;
        }
      }
    });

    if (closestKey) setActiveColumnKey(closestKey);
  }, [columns]);

  useEffect(() => {
    updateScrollBounds();
    window.addEventListener("resize", updateScrollBounds);
    return () => window.removeEventListener("resize", updateScrollBounds);
  }, [updateScrollBounds, items]);

  // Slide left / right handlers
  const handleSlideLeft = () => {
    if (!boardScrollRef.current) return;
    boardScrollRef.current.scrollBy({ left: -340, behavior: "smooth" });
  };

  const handleSlideRight = () => {
    if (!boardScrollRef.current) return;
    boardScrollRef.current.scrollBy({ left: 340, behavior: "smooth" });
  };

  // Jump to specific column
  const handleJumpToColumn = (key) => {
    const colEl = columnRefs.current[key];
    if (colEl && boardScrollRef.current) {
      colEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      setActiveColumnKey(key);
    }
  };

  // Canvas Mouse Pan (Drag-to-Scroll)
  const handleMouseDownCanvas = (e) => {
    // Only pan if not clicking a draggable card or interactive element
    if (
      e.target.closest('[draggable="true"]') ||
      e.target.closest("button") ||
      e.target.closest("a") ||
      e.target.closest("input")
    ) {
      return;
    }
    isPanningRef.current = true;
    setIsPanningActive(true);
    panStartXRef.current = e.pageX - boardScrollRef.current.offsetLeft;
    panScrollLeftRef.current = boardScrollRef.current.scrollLeft;
  };

  const handleMouseMoveCanvas = (e) => {
    if (!isPanningRef.current || !boardScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - boardScrollRef.current.offsetLeft;
    const walk = (x - panStartXRef.current) * 1.35;
    boardScrollRef.current.scrollLeft = panScrollLeftRef.current - walk;
  };

  const handleMouseUpCanvas = () => {
    isPanningRef.current = false;
    setIsPanningActive(false);
  };

  return (
    <div className="w-full flex flex-[1_0_auto] flex-col min-h-0 bg-transparent select-none border-t border-border dark:border-border">
      {/* 1. KANBAN SLIDE TOOLBAR & STAGE QUICK-NAVIGATOR */}
      <div className="px-5 py-3 border-b border-border dark:border-border bg-slate-50/70 dark:bg-zinc-900/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Stage Pills / Quick-Jump Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mr-1 hidden sm:inline-block">
            Stages:
          </span>
          {columns.map((col) => {
            const count = columnData[col.key]?.length || 0;
            const isFocused = activeColumnKey === col.key;
            const theme = STAGE_THEMES[col.key] || STAGE_THEMES["Submitted"];
            return (
              <button
                key={col.key}
                type="button"
                onClick={() => handleJumpToColumn(col.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 border",
                  isFocused
                    ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-50 border-slate-300 dark:border-zinc-700 shadow-xs ring-1 ring-slate-900/5 dark:ring-white/10"
                    : "bg-transparent text-slate-600 dark:text-zinc-400 border-transparent hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200"
                )}
                title={`Jump to ${col.label} stage (${count} items)`}
              >
                <span className={cn("w-2 h-2 rounded-full", theme.dot)} />
                <span>{col.label}</span>
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center",
                    isFocused
                      ? "bg-slate-100 text-slate-800 dark:bg-zinc-700 dark:text-zinc-200"
                      : "bg-slate-200/60 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Horizontal Navigation Arrows & Instruction */}
        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium hidden lg:flex items-center gap-1.5">
            <HugeIcon className="ph-bold ph-hand-grabbing text-xs" />
            <span>Drag canvas or use arrows to slide</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSlideLeft}
              disabled={!canScrollLeft}
              aria-label="Slide to previous section"
              title="Slide Left"
              className={cn(
                "h-8 w-8 rounded-lg border border-border dark:border-border flex items-center justify-center transition-all shadow-2xs",
                canScrollLeft
                  ? "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 cursor-pointer active:scale-95"
                  : "bg-slate-100/60 dark:bg-zinc-900/40 text-slate-300 dark:text-zinc-600 cursor-not-allowed opacity-50 border-transparent"
              )}
            >
              <HugeIcon className="ph-bold ph-caret-left text-sm" />
            </button>

            <button
              type="button"
              onClick={handleSlideRight}
              disabled={!canScrollRight}
              aria-label="Slide to next section"
              title="Slide Right"
              className={cn(
                "h-8 w-8 rounded-lg border border-border dark:border-border flex items-center justify-center transition-all shadow-2xs",
                canScrollRight
                  ? "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 cursor-pointer active:scale-95"
                  : "bg-slate-100/60 dark:bg-zinc-900/40 text-slate-300 dark:text-zinc-600 cursor-not-allowed opacity-50 border-transparent"
              )}
            >
              <HugeIcon className="ph-bold ph-caret-right text-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. KANBAN HORIZONTAL BOARD WITH SMOOTH SNAP & GRAB-SCROLL */}
      <div className="relative w-full flex flex-[1_0_auto] flex-col min-h-0">
        {/* Left Overflow Edge Fade Indicator */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-gray-100/90 via-gray-100/40 dark:from-zinc-950/90 dark:via-zinc-950/40 to-transparent pointer-events-none z-10 transition-opacity duration-300",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Right Overflow Edge Fade Indicator */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-gray-100/90 via-gray-100/40 dark:from-zinc-950/90 dark:via-zinc-950/40 to-transparent pointer-events-none z-10 transition-opacity duration-300",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}
        />

        <div
          ref={boardScrollRef}
          onScroll={updateScrollBounds}
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
          onMouseLeave={handleMouseUpCanvas}
          className={cn(
            "w-full flex-1 min-h-[540px] p-6 overflow-x-auto scroll-smooth snap-x snap-proximity bg-slate-50/30 dark:bg-zinc-900/20 scrollbar-thin",
            isPanningActive ? "cursor-grabbing select-none" : "cursor-grab"
          )}
        >
          <div className="flex gap-4.5 min-w-max items-start">
            {columns.map((col) => {
              const columnItems = columnData[col.key] || [];
              const theme = STAGE_THEMES[col.key] || STAGE_THEMES["Submitted"];
              const subtitle = STAGE_SUBTITLES[stream]?.[col.key] || "Pipeline Stage";
              const isOver = dragOverColumn === col.key;
              const draggingItemStatus = draggingItem ? normalizeStatus(draggingItem.status) : null;
              const isAllowedDrop =
                draggingItem &&
                draggingItemStatus !== col.key &&
                allowedTransitions[draggingItemStatus]?.includes(col.key);

              return (
                <div
                  key={col.key}
                  ref={(el) => {
                    if (el) columnRefs.current[col.key] = el;
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!draggingItem) return;
                    if (!isAllowedDrop) {
                      e.dataTransfer.dropEffect = "none";
                      if (dragOverColumn !== null) setDragOverColumn(null);
                      return;
                    }
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverColumn !== col.key) setDragOverColumn(col.key);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      setDragOverColumn(null);
                    }
                  }}
                  onDrop={(e) => onDropItem?.(e, col.key)}
                  className={cn(
                    "w-[315px] sm:w-[335px] lg:w-[350px] shrink-0 snap-start flex flex-col rounded-2xl bg-white/90 dark:bg-zinc-900/80 border border-slate-200/90 dark:border-zinc-800 p-4 shadow-xs transition-all duration-200 relative overflow-hidden",
                    theme.borderTop,
                    "border-t-3",
                    isOver && isAllowedDrop && "ring-2 ring-pup-maroon/60 border-pup-maroon bg-red-50/20 dark:bg-red-950/20 shadow-md"
                  )}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/80 dark:border-border select-none">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900 shadow-2xs", theme.dot)} />
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 tracking-tight leading-tight">
                          {col.label}
                        </h3>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                          {subtitle}
                        </p>
                      </div>
                    </div>

                    <span className={cn("inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold min-w-5 shadow-2xs", theme.badge)}>
                      {columnItems.length}
                    </span>
                  </div>

                  {/* Drop Invitation Target (Magnetic Visualizer) */}
                  {isOver && isAllowedDrop && (
                    <div className="mb-3 rounded-xl border-2 border-dashed border-pup-maroon/60 dark:border-red-500/60 p-3 bg-red-50/50 dark:bg-red-950/30 text-center text-xs font-semibold text-pup-maroon dark:text-red-400 animate-pulse select-none flex items-center justify-center gap-2 shadow-inner">
                      <HugeIcon className="ph-bold ph-arrow-down text-sm" />
                      <span>Release to move to {col.label}</span>
                    </div>
                  )}

                  {/* Cards Container */}
                  <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-340px)] min-h-[300px] p-0.5 scrollbar-thin">
                    {columnItems.map((item) => {
                      const itemStatus = normalizeStatus(item.status);
                      const locked = isItemLocked(item);
                      const isDragging = draggingItem?.id === item.id;

                      // Proposal specific attributes
                      const isProposal = stream === "proposals";
                      const title = isProposal ? item.title : item.event_title || item.title;
                      const orgName = item.verified_org_name || item.organization_name;
                      const acronym = item.org_acronym;
                      const proponent = item.student_name || item.submitted_by_email || "Student Officer";
                      const dateStr = item.created_at
                        ? new Date(item.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "N/A";

                      // Post-event specific attributes
                      const attendees = item.actual_attendance ?? item.total_attendance ?? item.actual_attendees ?? null;
                      const expenses = item.total_expenses ?? item.actual_expenses ?? null;

                      return (
                        <div
                          key={item.id}
                          draggable={!locked}
                          onDragStart={(e) => {
                            if (locked) {
                              e.preventDefault();
                              return;
                            }
                            isDraggingCardRef.current = true;
                            setDraggingItem?.(item);
                            e.dataTransfer.setData("text/plain", String(item.id));
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            setDraggingItem?.(null);
                            setDragOverColumn?.(null);
                            setTimeout(() => {
                              isDraggingCardRef.current = false;
                            }, 120);
                          }}
                          onClick={() => {
                            if (isDraggingCardRef.current) return;
                            onSelectItem?.(item);
                          }}
                          className={cn(
                            "group relative rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-800/90 p-3.5 shadow-2xs hover:shadow-md hover:border-pup-maroon/40 dark:hover:border-red-900/50 transition-all duration-200 flex flex-col gap-2.5 active:scale-[0.985] select-none",
                            locked ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
                            isDragging && "opacity-30 scale-[0.97] border-dashed border-pup-maroon"
                          )}
                        >
                          {/* Card Top Row: Org Acronym + Org Name + Reference & Grip/Lock */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 truncate max-w-[210px]">
                              {acronym && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-red-50 text-pup-maroon dark:bg-red-950/50 dark:text-red-400 border border-red-200/70 dark:border-red-900/40 shrink-0">
                                  {acronym}
                                </span>
                              )}
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 truncate">
                                {orgName}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-mono text-[9px] text-slate-400 dark:text-zinc-500">
                                #{isProposal ? "EP" : "PER"}-{item.id}
                              </span>

                              {locked ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex items-center text-amber-600/90 dark:text-amber-400/90 p-0.5 cursor-pointer ml-1">
                                      <HugeIcon className="ph-bold ph-lock-key text-xs" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {item.status} items are locked from direct drag-and-drop. Click to review.
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <HugeIcon
                                  className="ph-bold ph-dots-six-vertical text-slate-400 group-hover:text-slate-800 dark:group-hover:text-zinc-200 text-base transition-colors shrink-0 ml-1"
                                  title="Drag to change pipeline stage"
                                />
                              )}
                            </div>
                          </div>

                          {/* Card Headline / Title */}
                          <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                            {title}
                          </h4>

                          {/* Proponent Officer */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-zinc-400">
                            <HugeIcon className="ph-bold ph-user-check text-emerald-600 dark:text-emerald-400 text-xs shrink-0" />
                            <span className="truncate font-medium text-slate-700 dark:text-zinc-300">
                              {proponent}
                            </span>
                          </div>

                          {/* Proposal Details: Event Date, Target Attendance, Estimated Budget */}
                          {isProposal && (item.event_date || item.target_attendance || item.estimated_budget) && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {item.event_date && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[10px] font-semibold text-slate-700 dark:text-zinc-300 border border-slate-200/70 dark:border-zinc-700">
                                  <HugeIcon className="ph-bold ph-calendar text-[10px] text-slate-400" />
                                  {new Date(item.event_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </span>
                              )}
                              {item.target_attendance && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[10px] font-semibold text-slate-700 dark:text-zinc-300 border border-slate-200/70 dark:border-zinc-700">
                                  <HugeIcon className="ph-bold ph-users text-[10px] text-slate-400" />
                                  {Number(item.target_attendance).toLocaleString()} target
                                </span>
                              )}
                              {item.estimated_budget && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[10px] font-semibold text-slate-700 dark:text-zinc-300 border border-slate-200/70 dark:border-zinc-700">
                                  <HugeIcon className="ph-bold ph-coins text-[10px] text-amber-500" />
                                  ₱{Number(item.estimated_budget).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Post-Event Details: Attendance & Spend Pills */}
                          {!isProposal && (attendees !== null || expenses !== null) && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {attendees !== null && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[10px] font-semibold text-slate-700 dark:text-zinc-300 border border-slate-200/70 dark:border-zinc-700">
                                  <HugeIcon className="ph-bold ph-users text-[10px] text-slate-400" />
                                  {Number(attendees).toLocaleString()} attendees
                                </span>
                              )}
                              {expenses !== null && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40">
                                  <HugeIcon className="ph-bold ph-receipt text-[10px] text-emerald-500" />
                                  ₱{Number(expenses).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Post-Event Documents Links */}
                          {!isProposal && (item.narrative_storage_filename || item.liquidation_storage_filename) && (
                            <div
                              className="flex items-center gap-2 pt-1 border-t border-border/80 dark:border-border"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.narrative_storage_filename && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onOpenPdfPreview?.({
                                      url: `/api/osas/post-event-reports/${item.id}?file=narrative`,
                                      title: `${item.event_title}: Narrative Report`,
                                      subtitle: "Official post-event narrative & accomplishment report.",
                                      docType: "Post-Event Narrative",
                                      originalFilename: item.narrative_original_filename || "Narrative.pdf",
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-pup-maroon dark:text-red-400 hover:underline cursor-pointer border-0 bg-transparent p-0"
                                >
                                  <HugeIcon className="ph-bold ph-file-text text-xs" />
                                  <span>Narrative</span>
                                </button>
                              )}
                              {item.liquidation_storage_filename && (
                                <>
                                  <span className="text-slate-300 dark:text-zinc-600 text-[10px]">·</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onOpenPdfPreview?.({
                                        url: `/api/osas/post-event-reports/${item.id}?file=liquidation`,
                                        title: `${item.event_title}: Financial Liquidation`,
                                        subtitle: "Official receipts, disbursement summary, and vouchers.",
                                        docType: "Financial Liquidation",
                                        originalFilename: item.liquidation_original_filename || "Liquidation.pdf",
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer border-0 bg-transparent p-0"
                                  >
                                    <HugeIcon className="ph-bold ph-receipt text-xs" />
                                    <span>Liquidation</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {/* Card Footer: Timestamp + Review Action Button */}
                          <div className="pt-2 border-t border-border/80 dark:border-border flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                            <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500 font-normal">
                              <HugeIcon className="ph ph-clock text-xs text-slate-400 dark:text-zinc-500" />
                              {dateStr}
                            </span>
                            <span className="text-xs font-semibold text-pup-maroon dark:text-red-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                              <span>Review Proposal</span>
                              <HugeIcon className="ph-bold ph-arrow-right text-[10px]" />
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty Column Placeholder */}
                    {!columnItems.length && (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 py-10 px-3 text-center flex flex-col items-center justify-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500">
                          <HugeIcon className="ph-duotone ph-tray text-lg" />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 font-semibold">
                          No {stream === "proposals" ? "proposals" : "reports"} in this stage
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 max-w-[200px] leading-relaxed">
                          Drag eligible items here to advance pipeline status
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

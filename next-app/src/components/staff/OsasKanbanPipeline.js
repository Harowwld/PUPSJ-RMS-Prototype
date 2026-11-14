"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { getOsasRecordReference } from "@/lib/osasRecordReference";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty";
import {
  KanbanStatusIcon,
  KanbanCardTag,
  KANBAN_CARD_CLASS,
  KANBAN_CARD_DRAGGING_CLASS,
  KANBAN_CARD_HEADER_CLASS,
  KANBAN_CARD_TITLE_CLASS,
  KANBAN_CARD_FOOTER_CLASS,
  KanbanMiniAvatar,
} from "@/components/shared/KanbanPrimitives";
import {
  InboxIcon,
  ArrowDown01Icon,
  File02Icon,
  LockIcon,
} from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";

const STAGE_THEMES = {
  Submitted: {
    dropZone:
      "border-gray-400/60 bg-gray-50/60 dark:bg-zinc-800/40 text-gray-700 dark:text-zinc-300",
  },
  "Under Review": {
    dropZone:
      "border-sky-500/50 bg-sky-50/60 dark:bg-sky-950/25 text-sky-700 dark:text-sky-300",
  },
  "Needs Revision": {
    dropZone:
      "border-amber-500/50 bg-amber-50/60 dark:bg-amber-950/25 text-amber-700 dark:text-amber-300",
  },
  Approved: {
    dropZone:
      "border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-300",
  },
  Cleared: {
    dropZone:
      "border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-300",
  },
  Declined: {
    dropZone:
      "border-rose-500/50 bg-rose-50/60 dark:bg-rose-950/25 text-rose-700 dark:text-rose-300",
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
  scrollRef,
  onScrollBoundsChange,
}) {
  const internalBoardScrollRef = useRef(null);
  const boardScrollRef = scrollRef || internalBoardScrollRef;
  const isDraggingCardRef = useRef(false);

  // Horizontal scroll state
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
        const firstCol = columns[0]?.key;
        if (firstCol && map[firstCol]) map[firstCol].push(item);
      }
    });
    return map;
  }, [columns, items, normalizeStatus]);

  // Update scroll bounds from the board element so the handler stays stable.
  const reportScrollBounds = useCallback(
    (el) => {
      if (!el) return;
      const hasLeft = el.scrollLeft > 12;
      const hasRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 12;
      setCanScrollLeft(hasLeft);
      setCanScrollRight(hasRight);
      onScrollBoundsChange?.({ canScrollLeft: hasLeft, canScrollRight: hasRight });
    },
    [onScrollBoundsChange]
  );

  useEffect(() => {
    const updateScrollBounds = () => reportScrollBounds(boardScrollRef.current);
    updateScrollBounds();
    window.addEventListener("resize", updateScrollBounds);
    return () => window.removeEventListener("resize", updateScrollBounds);
  }, [boardScrollRef, items, reportScrollBounds]);

  // Canvas Mouse Pan (Drag-to-Scroll)
  const handleMouseDownCanvas = (e) => {
    if (
      e.target.closest('[draggable="true"]') ||
      e.target.closest(".kanban-card") ||
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
    <div className="w-full flex-1 flex flex-col min-h-0 bg-transparent select-none border-t border-border dark:border-border">
      {/* Kanban board with smooth snap and grab scrolling */}
      <div className="relative w-full flex-1 flex flex-col min-h-0">
        {/* Left Overflow Edge Fade Indicator */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/80 dark:from-zinc-950/80 to-transparent pointer-events-none z-10 transition-opacity duration-300",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Right Overflow Edge Fade Indicator */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/80 dark:from-zinc-950/80 to-transparent pointer-events-none z-10 transition-opacity duration-300",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}
        />

        <div
          ref={boardScrollRef}
          onScroll={(event) => reportScrollBounds(event.currentTarget)}
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
          onMouseLeave={handleMouseUpCanvas}
          className={cn(
            "w-full flex-1 flex flex-col min-h-[calc(100vh-20rem)] p-4 pl-6 sm:p-5 sm:pl-6 overflow-x-auto scroll-pl-6 scroll-smooth snap-x snap-proximity scrollbar-thin",
            isPanningActive ? "cursor-grabbing select-none" : "cursor-grab"
          )}
        >
          <div className="flex gap-3.5 min-w-max items-stretch flex-1 h-full min-h-[500px]">
            {columns.map((col) => {
              const columnItems = columnData[col.key] || [];
              const theme = STAGE_THEMES[col.key] || STAGE_THEMES.Submitted;
              const isOver = dragOverColumn === col.key;
              const draggingItemStatus = draggingItem
                ? normalizeStatus(draggingItem.status)
                : null;
              const isAllowedDrop =
                draggingItem &&
                draggingItemStatus !== col.key &&
                allowedTransitions[draggingItemStatus]?.includes(col.key);

              return (
                <div
                  key={col.key}
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
                    "w-[310px] sm:w-[325px] shrink-0 snap-start flex flex-col h-full rounded-2xl border border-gray-200/60 dark:border-white/[0.06] bg-gray-100/75 dark:bg-zinc-900/60 p-2.5 transition-all duration-200 relative",
                    isOver &&
                      isAllowedDrop &&
                      "ring-2 ring-gray-400/60 dark:ring-zinc-600 bg-gray-200/60 dark:bg-zinc-800/70"
                  )}
                >
                  {/* Clean Single-Line Column Header */}
                  <div className="flex items-center justify-between px-2 pt-1.5 pb-2.5 select-none shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <KanbanStatusIcon status={col.key} />
                      <h3 className="text-[13px] font-semibold tracking-tight text-gray-800 dark:text-zinc-100 truncate">
                        {col.label}
                      </h3>
                      <span className="text-xs font-medium text-gray-400 dark:text-zinc-500 tabular-nums">
                        {columnItems.length}
                      </span>
                    </div>
                  </div>

                  {/* Drop Invitation Target */}
                  {isOver && isAllowedDrop && (
                    <div
                      className={cn(
                        "mb-2 rounded-xl border border-dashed p-3 text-center text-xs font-medium select-none flex items-center justify-center gap-1.5 transition-all shrink-0",
                        theme.dropZone
                      )}
                    >
                      <ArrowDown01Icon size="1em" className="text-sm" />
                      <span>Release to move to {col.label}</span>
                    </div>
                  )}

                  {/* Cards Container */}
                  <div className="flex flex-col gap-2 h-[760px] overflow-y-auto px-0.5 pb-0.5 scrollbar-thin">
                    {columnItems.map((item) => {
                      const itemStatus = normalizeStatus(item.status);
                      const locked = isItemLocked(item);
                      const isDragging = draggingItem?.id === item.id;

                      const isProposal = stream === "proposals";
                      const title = isProposal
                        ? item.title
                        : item.event_title || item.title;
                      const orgName =
                        item.verified_org_name || item.organization_name;
                      const acronym = item.org_acronym;
                      const proponent =
                        item.student_name ||
                        item.submitted_by_email ||
                        "Student Officer";
                      const dateStr = item.created_at
                        ? new Date(item.created_at).toLocaleDateString(
                            "en-PH",
                            {
                              timeZone: "Asia/Manila",
                              month: "short",
                              day: "numeric",
                            }
                          )
                        : "N/A";

                      const attendees =
                        item.actual_attendance ??
                        item.total_attendance ??
                        item.actual_attendees ??
                        null;
                      const expenses =
                        item.total_expenses ?? item.actual_expenses ?? null;

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
                            KANBAN_CARD_CLASS,
                            locked
                              ? "cursor-pointer"
                              : "cursor-grab active:cursor-grabbing",
                            isDragging &&
                              KANBAN_CARD_DRAGGING_CLASS
                          )}
                        >
                          {/* Row 1: Status Icon + Proposal/Event Title (left) & Date (right) */}
                          <div className={KANBAN_CARD_HEADER_CLASS}>
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <KanbanStatusIcon
                                status={itemStatus}
                                className="mt-[3px]"
                              />
                              <h4 className={KANBAN_CARD_TITLE_CLASS} title={title}>
                                {title}
                              </h4>
                            </div>

                            <span
                              className={cn(
                                "text-[11px] font-medium tabular-nums shrink-0",
                                itemStatus === "Declined"
                                  ? "text-rose-600 dark:text-rose-400"
                                  : itemStatus === "Needs Revision"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-gray-400 dark:text-zinc-500"
                              )}
                            >
                              {dateStr}
                            </span>
                          </div>

                          {/* Row 2: Organization and event metadata */}
                          <div className="flex flex-col gap-1 pl-5.5">
                            {(acronym || orgName) && (
                              <span title={orgName || acronym} className="block truncate text-[11px] text-gray-600 dark:text-zinc-300">
                                {orgName || acronym}
                              </span>
                            )}

                            <div className="flex min-w-0 items-center gap-1.5">
                              {isProposal && item.event_date && (
                                <KanbanCardTag label={new Date(
                                    item.event_date
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })} />
                              )}

                              {isProposal && item.estimated_budget && (
                                <KanbanCardTag label={`₱${Number(
                                    item.estimated_budget
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                  })}`} />
                              )}

                              {isProposal &&
                                !item.estimated_budget &&
                                item.target_attendance && (
                                  <KanbanCardTag label={`${Number(
                                      item.target_attendance
                                    ).toLocaleString()} target`} />
                                )}

                              {!isProposal && attendees !== null && (
                                <KanbanCardTag label={`${Number(
                                    attendees
                                  ).toLocaleString()} attendees`} />
                              )}

                              {!isProposal && expenses !== null && (
                                <KanbanCardTag label={`₱${Number(expenses).toLocaleString(
                                    undefined,
                                    { minimumFractionDigits: 2 }
                                  )}`} />
                              )}
                            </div>
                          </div>

                          {/* Post-Event Quick Document Preview Links */}
                          {!isProposal &&
                            (item.narrative_storage_filename ||
                              item.liquidation_storage_filename) && (
                              <div
                                className="flex items-center gap-2 pl-5.5 text-[11px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {item.narrative_storage_filename && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onOpenPdfPreview?.({
                                        url: `/api/osas/post-event-reports/${item.id}?file=narrative`,
                                        title: `${item.event_title}: Narrative Report`,
                                        subtitle:
                                          "Official post-event narrative & accomplishment report.",
                                        docType: "Post-Event Narrative",
                                        originalFilename:
                                          item.narrative_original_filename ||
                                          "Narrative.pdf",
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:underline cursor-pointer border-0 bg-transparent p-0"
                                  >
                                    <File02Icon size={12} />
                                    <span>Narrative</span>
                                  </button>
                                )}
                                {item.liquidation_storage_filename && (
                                  <>
                                    {item.narrative_storage_filename && (
                                      <span className="text-gray-300 dark:text-zinc-600">
                                        ·
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onOpenPdfPreview?.({
                                          url: `/api/osas/post-event-reports/${item.id}?file=liquidation`,
                                          title: `${item.event_title}: Financial Liquidation`,
                                          subtitle:
                                            "Official receipts, disbursement summary, and vouchers.",
                                          docType: "Financial Liquidation",
                                          originalFilename:
                                            item.liquidation_original_filename ||
                                            "Liquidation.pdf",
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer border-0 bg-transparent p-0"
                                    >
                                      <AppIcon className="Invoice01Icon text-xs" />
                                      <span>Liquidation</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                          {/* Row 3: Footer — Reference ID (bottom-left) + Proponent Avatar & Name (bottom-right) */}
                          <div className={KANBAN_CARD_FOOTER_CLASS}>
                            <div className="flex items-center gap-1.5 font-medium tabular-nums">
                              <Badge variant="gray" size="compact" className="rounded-lg">
                                {getOsasRecordReference(item, stream)}
                              </Badge>
                              {locked && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center text-gray-400 dark:text-zinc-500">
                                      <LockIcon size={12} aria-hidden="true" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {item.status} items are locked from direct
                                    drag-and-drop. Click to review.
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 min-w-0 max-w-[165px]">
                              <KanbanMiniAvatar
                                name={proponent}
                                className="font-semibold"
                              />
                              <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400 truncate">
                                {proponent}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty Column Placeholder */}
                    {!columnItems.length && !isOver && (
                      <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <EmptyState
                          variant="compact"
                          icon={InboxIcon}
                          title={`No ${
                            stream === "proposals" ? "proposals" : "reports"
                          } in stage`}
                          description="Drag eligible items here to advance status"
                        />
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

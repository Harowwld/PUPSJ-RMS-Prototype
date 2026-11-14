"use client";
import { BADGE_BASE } from "@/lib/badgeStyles";


import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { formatPHDateTime } from "@/lib/timeFormat";
import { getRequestCharterStatus } from "@/lib/citizenCharter";
import {
  canTransitionRequestStatus,
  isTerminalRequestStatus,
} from "@/lib/constants";
import {
  Attachment01Icon,
  Clock01Icon,
  LockIcon,
  ViewIcon,
} from "hugeicons-react";

export const ODRS_KANBAN_COLUMNS = [
  {
    key: "Pending",
    label: "Pending",
    subtitle: "Initial Intake",
    accent: "bg-amber-500",
    borderTop: "border-t-amber-500",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    dropZone: "border-amber-500/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
  },
  {
    key: "PendingPayment",
    label: "Pending Payment",
    subtitle: "Assessment & Proof",
    accent: "bg-indigo-500",
    borderTop: "border-t-indigo-500",
    badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
    dropZone: "border-indigo-500/60 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300",
  },
  {
    key: "InProgress",
    label: "In Progress",
    subtitle: "Records Processing",
    accent: "bg-sky-500",
    borderTop: "border-t-sky-500",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
    dropZone: "border-sky-500/60 bg-sky-50/60 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300",
  },
  {
    key: "Ready",
    label: "Ready",
    subtitle: "Ready for Pickup",
    accent: "bg-emerald-500",
    borderTop: "border-t-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    dropZone: "border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
  },
  {
    key: "Completed",
    label: "Completed",
    subtitle: "Claimed & Released",
    accent: "bg-teal-600",
    borderTop: "border-t-teal-600",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300",
    dropZone: "border-teal-500/60 bg-teal-50/60 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300",
  },
  {
    key: "Cancelled",
    label: "Cancelled",
    subtitle: "Cancelled / Terminated",
    accent: "bg-rose-500",
    borderTop: "border-t-rose-500",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
    dropZone: "border-rose-500/60 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",
  },
];

export default function DocumentRequestKanbanPipeline({
  items = [],
  onSelectItem,
  onDropItem,
  slaStandards = null,
  statusBadgeClass,
  scrollRef,
}) {
  const internalBoardScrollRef = useRef(null);
  const boardScrollRef = scrollRef || internalBoardScrollRef;
  const isDraggingCardRef = useRef(false);

  const [draggingItem, setDraggingItem] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Mouse pan / drag-to-scroll canvas state
  const isPanningRef = useRef(false);
  const panStartXRef = useRef(0);
  const panScrollLeftRef = useRef(0);
  const [isPanningActive, setIsPanningActive] = useState(false);

  // Group items by column
  const columnData = useMemo(() => {
    const map = {};
    ODRS_KANBAN_COLUMNS.forEach((col) => {
      map[col.key] = [];
    });

    items.forEach((item) => {
      const status = item.status || "Pending";
      if (map[status]) {
        map[status].push(item);
      } else if (status === "Deficient") {
        // Map Deficient into Pending or Cancelled column based on workflow
        if (map.Pending) map.Pending.push(item);
      } else if (status === "Shredded") {
        if (map.Cancelled) map.Cancelled.push(item);
      } else {
        if (map.Pending) map.Pending.push(item);
      }
    });

    return map;
  }, [items]);

  // Canvas Mouse Pan (Drag-to-Scroll)
  const handleMouseDownCanvas = (e) => {
    if (isDraggingCardRef.current) return;
    if (e.target.closest("button") || e.target.closest("[role='button']") || e.target.closest(".kanban-card")) return;
    if (e.button !== 0) return;

    isPanningRef.current = true;
    panStartXRef.current = e.pageX - (boardScrollRef.current?.offsetLeft || 0);
    panScrollLeftRef.current = boardScrollRef.current?.scrollLeft || 0;
    setIsPanningActive(true);
  };

  const handleMouseMoveCanvas = useCallback((e) => {
    if (!isPanningRef.current || !boardScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - (boardScrollRef.current.offsetLeft || 0);
    const walk = (x - panStartXRef.current) * 1.5;
    boardScrollRef.current.scrollLeft = panScrollLeftRef.current - walk;
  }, [boardScrollRef]);

  const handleMouseUpCanvas = useCallback(() => {
    isPanningRef.current = false;
    setIsPanningActive(false);
  }, []);

  useEffect(() => {
    const handleUp = () => handleMouseUpCanvas();
    const handleMove = (e) => handleMouseMoveCanvas(e);

    window.addEventListener("mouseup", handleUp);
    window.addEventListener("mousemove", handleMove);

    return () => {
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("mousemove", handleMove);
    };
  }, [handleMouseMoveCanvas, handleMouseUpCanvas]);

  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    isDraggingCardRef.current = true;
    setDraggingItem(item);
    e.dataTransfer.setData("text/plain", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    isDraggingCardRef.current = false;
    setDraggingItem(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    if (dragOverColumn !== colKey) {
      setDragOverColumn(colKey);
    }
  };

  const handleDragLeave = (e, colKey) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverColumn === colKey) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    isDraggingCardRef.current = false;

    if (!draggingItem) return;
    if (draggingItem.status === targetStatus) return;

    const allowed = canTransitionRequestStatus(draggingItem.status, targetStatus);
    if (!allowed) return;

    onDropItem?.(draggingItem, targetStatus);
    setDraggingItem(null);
  };

  return (
    <div
      ref={boardScrollRef}
      onMouseDown={handleMouseDownCanvas}
      className={cn(
        "flex w-full min-h-[520px] flex-1 gap-4 overflow-x-auto p-4 sm:p-5 select-none scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-700 bg-gray-50/50 dark:bg-zinc-950/20",
        isPanningActive ? "cursor-grabbing" : "cursor-default"
      )}
    >
      {ODRS_KANBAN_COLUMNS.map((col) => {
        const colItems = columnData[col.key] || [];
        const isTarget = dragOverColumn === col.key;
        const isSource = draggingItem?.status === col.key;
        const isValidTransition = draggingItem
          ? canTransitionRequestStatus(draggingItem.status, col.key)
          : false;

        return (
          <div
            key={col.key}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={(e) => handleDragLeave(e, col.key)}
            onDrop={(e) => handleDrop(e, col.key)}
            className={cn(
              "flex flex-col w-[300px] shrink-0 rounded-2xl border bg-white dark:bg-card border-border dark:border-white/10 shadow-xs overflow-hidden transition-all duration-200",
              col.borderTop,
              "border-t-3",
              isTarget && isValidTransition && "ring-2 ring-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10",
              isTarget && !isValidTransition && draggingItem && "ring-2 ring-rose-500/80 bg-rose-50/20 dark:bg-rose-950/10"
            )}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-border/80 dark:border-white/10 bg-white dark:bg-card">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                    {col.label}
                  </span>
                  <span className={cn("rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.2 text-[10px] font-semibold tabular-nums text-gray-600 dark:text-zinc-300", BADGE_BASE)}>
                    {colItems.length}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                  {col.subtitle}
                </span>
              </div>
            </div>

            {/* Drop Zone Visual Indicator */}
            {isTarget && draggingItem && !isSource && (
              <div
                className={cn(
                  "m-2.5 p-3 rounded-xl border-2 border-dashed flex items-center justify-center text-xs font-semibold transition-all animate-pulse",
                  isValidTransition ? col.dropZone : "border-rose-400 bg-rose-50/50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400"
                )}
              >
                {isValidTransition ? `Drop to move to ${col.label}` : "Transition not allowed"}
              </div>
            )}

            {/* Column Body / Cards */}
            <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-22rem)]">
              {colItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-gray-400 dark:text-zinc-500 border border-dashed border-border/60 dark:border-white/10 rounded-xl my-4">
                  <span>No requests in this stage</span>
                </div>
              ) : (
                colItems.map((item) => {
                  const isLocked = isTerminalRequestStatus(item.status);
                  const isDraggingThis = draggingItem?.id === item.id;
                  const charter = getRequestCharterStatus(item, slaStandards);
                  const dateFormatted = item.created_at ? formatPHDateTime(item.created_at) : "Date unavailable";
                  const studentName = item.student_name || "Unknown Student";
                  const badgeStyle = statusBadgeClass ? statusBadgeClass(item.status) : "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300";

                  return (
                    <div
                      key={item.id}
                      draggable={!isLocked}
                      onDragStart={(e) => handleDragStart(e, item)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectItem?.(item.id)}
                      className={cn(
                        "kanban-card group relative p-3 rounded-xl border border-border/70 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-sm hover:border-gray-300 dark:hover:border-zinc-700 transition-all cursor-pointer",
                        isDraggingThis && "opacity-40 scale-98 border-dashed border-gray-400",
                        isLocked && "cursor-default opacity-85"
                      )}
                    >
                      {/* Top Bar: Identifier, Client Type, Lock/Action */}
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-700 dark:text-zinc-300">
                            #{item.id}
                          </span>
                          <span
                            className={cn("inline-flex items-center rounded-full px-2 py-0.2 text-[10px] font-medium shrink-0", item.client_type === "Parent"
                                ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40"
                                : item.client_type === "Alumni" || item.is_alumni
                                ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/30"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30", BADGE_BASE)}
                          >
                            {item.client_type === "Parent" ? "Parent" : item.client_type === "Alumni" || item.is_alumni ? "Alumni" : "Student"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {isLocked && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-gray-400 dark:text-zinc-500">
                                  <LockIcon size={13} aria-hidden="true" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Terminal record (locked)</TooltipContent>
                            </Tooltip>
                          )}
                          {Number(item.attachment_count) > 0 && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-zinc-400"
                              title={`${item.attachment_count} attachment(s)`}
                            >
                              <Attachment01Icon size={12} />
                              {item.attachment_count}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle: Requester Name & Student Info */}
                      <div className="mb-2.5">
                        <h4 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors line-clamp-1">
                          {studentName}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                          {item.student_no ? (
                            <span className="tabular-nums font-medium text-gray-600 dark:text-zinc-300">
                              {item.student_no}
                            </span>
                          ) : (
                            <span className="italic text-amber-600 dark:text-amber-400 text-[11px]">No ID</span>
                          )}
                          {item.course_code && (
                            <>
                              <span>·</span>
                              <span className="truncate">{item.course_code}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Doc Type Badge */}
                      <div className="mb-2.5">
                        <span className={cn("inline-flex items-center rounded-full bg-gray-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[11px] font-semibold text-gray-800 dark:text-zinc-200 line-clamp-1 max-w-full", BADGE_BASE)}>
                          {item.doc_type}
                        </span>
                      </div>

                      {/* SLA Chip & Date */}
                      <div className="pt-2 border-t border-border/60 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
                        <span className={cn("inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-semibold shrink-0", charter.badgeClass, BADGE_BASE)}>
                          <Clock01Icon size={10} className="mr-1" />
                          {charter.label}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 tabular-nums">
                          {dateFormatted}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

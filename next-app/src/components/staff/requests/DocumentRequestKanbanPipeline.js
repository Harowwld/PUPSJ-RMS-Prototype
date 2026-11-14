"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  KanbanStatusIcon,
  KANBAN_CARD_CLASS,
  KANBAN_CARD_DRAGGING_CLASS,
  KANBAN_CARD_HEADER_CLASS,
  KANBAN_CARD_TITLE_CLASS,
  KANBAN_CARD_FOOTER_CLASS,
  KANBAN_CARD_METADATA_CLASS,
  KanbanCardTag,
  KanbanMiniAvatar,
} from "@/components/shared/KanbanPrimitives";
import { formatPHDateTime } from "@/lib/timeFormat";
import { getRequestCharterStatus } from "@/lib/citizenCharter";
import {
  canTransitionRequestStatus,
  isTerminalRequestStatus,
} from "@/lib/constants";
import {
  Attachment01Icon,
  InboxIcon,
  LockIcon,
} from "hugeicons-react";
import { EmptyState } from "@/components/ui/empty";

export const ODRS_KANBAN_COLUMNS = [
  {
    key: "Pending",
    label: "Pending",
    dropZone:
      "border-amber-500/50 bg-amber-50/60 dark:bg-amber-950/25 text-amber-700 dark:text-amber-300",
  },
  {
    key: "PendingPayment",
    label: "Pending Payment",
    dropZone:
      "border-sky-500/50 bg-sky-50/60 dark:bg-sky-950/25 text-sky-700 dark:text-sky-300",
  },
  {
    key: "InProgress",
    label: "In Progress",
    dropZone:
      "border-sky-500/50 bg-sky-50/60 dark:bg-sky-950/25 text-sky-700 dark:text-sky-300",
  },
  {
    key: "Ready",
    label: "Ready",
    dropZone:
      "border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-300",
  },
  {
    key: "Completed",
    label: "Completed",
    dropZone:
      "border-teal-500/50 bg-teal-50/60 dark:bg-teal-950/25 text-teal-700 dark:text-teal-300",
  },
  {
    key: "Cancelled",
    label: "Cancelled",
    dropZone:
      "border-rose-500/50 bg-rose-50/60 dark:bg-rose-950/25 text-rose-700 dark:text-rose-300",
  },
];

function formatShortRequestDate(dateInput) {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function DocumentRequestKanbanPipeline({
  items = [],
  onSelectItem,
  onDropItem,
  slaStandards = null,
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
    if (
      e.target.closest("button") ||
      e.target.closest("[role='button']") ||
      e.target.closest(".kanban-card")
    )
      return;
    if (e.button !== 0) return;

    isPanningRef.current = true;
    panStartXRef.current = e.pageX - (boardScrollRef.current?.offsetLeft || 0);
    panScrollLeftRef.current = boardScrollRef.current?.scrollLeft || 0;
    setIsPanningActive(true);
  };

  const handleMouseMoveCanvas = useCallback(
    (e) => {
      if (!isPanningRef.current || !boardScrollRef.current) return;
      e.preventDefault();
      const x = e.pageX - (boardScrollRef.current.offsetLeft || 0);
      const walk = (x - panStartXRef.current) * 1.5;
      boardScrollRef.current.scrollLeft = panScrollLeftRef.current - walk;
    },
    [boardScrollRef]
  );

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
        "w-full flex-1 flex flex-col min-h-[calc(100vh-19rem)] overflow-x-auto p-4 sm:p-5 select-none scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-700",
        isPanningActive ? "cursor-grabbing" : "cursor-grab"
      )}
    >
      <div className="flex items-stretch gap-3.5 min-w-max flex-1 h-full min-h-[500px]">
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
                "flex flex-col w-[300px] shrink-0 h-full rounded-2xl border border-gray-200/60 dark:border-white/[0.06] bg-gray-100/75 dark:bg-zinc-900/60 p-2.5 transition-all duration-200",
                isTarget &&
                  isValidTransition &&
                  "ring-2 ring-emerald-500/70 bg-emerald-50/30 dark:bg-emerald-950/15",
                isTarget &&
                  !isValidTransition &&
                  draggingItem &&
                  !isSource &&
                  "ring-2 ring-rose-500/70 bg-rose-50/30 dark:bg-rose-950/15"
              )}
            >
              {/* Clean Single-Line Column Header */}
              <div className="flex items-center justify-between px-2 pt-1.5 pb-2.5 select-none shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <KanbanStatusIcon status={col.key} />
                  <span className="text-[13px] font-semibold tracking-tight text-gray-800 dark:text-zinc-100 truncate">
                    {col.label}
                  </span>
                  <span className="text-xs font-medium text-gray-400 dark:text-zinc-500 tabular-nums">
                    {colItems.length}
                  </span>
                </div>
              </div>

              {/* Drop Zone Visual Indicator */}
              {isTarget && draggingItem && !isSource && (
                <div
                  className={cn(
                    "mb-2 p-3 rounded-xl border border-dashed flex items-center justify-center text-xs font-medium transition-all shrink-0",
                    isValidTransition
                      ? col.dropZone
                      : "border-rose-400 bg-rose-50/50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400"
                  )}
                >
                  {isValidTransition
                    ? `Drop to move to ${col.label}`
                    : "Transition not allowed"}
                </div>
              )}

              {/* Column Body / Cards */}
              <div className="flex flex-col gap-2 h-[760px] overflow-y-auto px-0.5 pb-0.5 scrollbar-thin">
                {colItems.length === 0 && !isTarget ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <EmptyState
                      variant="compact"
                      icon={InboxIcon}
                      title="No requests in stage"
                      description="Drag eligible requests here to advance status"
                    />
                  </div>
                ) : (
                  colItems.map((item) => {
                  const status = item.status || "Pending";
                  const isLocked = isTerminalRequestStatus(status);
                  const isDraggingThis = draggingItem?.id === item.id;
                  const charter = getRequestCharterStatus(item, slaStandards);
                  const dateFormatted = item.created_at
                    ? formatPHDateTime(item.created_at)
                    : "Date unavailable";
                  const shortDate = formatShortRequestDate(item.created_at);
                  const requesterName = item.requester_name || item.student_name || "Unknown Requester";
                  const clientLabel =
                    item.client_type === "Parent"
                      ? "Parent"
                      : item.client_type === "Alumni" || item.is_alumni
                      ? "Alumni"
                      : "Student";
                  const topRightText = isLocked
                    ? shortDate || charter.label
                    : charter.label || shortDate;

                  return (
                    <div
                      key={item.id}
                      draggable={!isLocked}
                      onDragStart={(e) => handleDragStart(e, item)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectItem?.(item.id)}
                      className={cn(
                        KANBAN_CARD_CLASS,
                        isLocked ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
                        isDraggingThis && KANBAN_CARD_DRAGGING_CLASS
                      )}
                    >
                      {/* Row 1: Status Icon + Student Name (left) & SLA / Date (right) */}
                      <div className={KANBAN_CARD_HEADER_CLASS}>
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <KanbanStatusIcon status={status} className="mt-[3px]" />
                          <h4 className={KANBAN_CARD_TITLE_CLASS} title={requesterName}>
                            {requesterName}
                          </h4>
                        </div>

                        <span
                          className={cn(
                            "text-[11px] font-medium tabular-nums shrink-0",
                            charter.isOverdue
                              ? "text-rose-600 dark:text-rose-400"
                              : charter.isDueSoon
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-gray-400 dark:text-zinc-500"
                          )}
                          title={`${charter.detail || charter.label} · Created ${dateFormatted}`}
                        >
                          {topRightText}
                        </span>
                      </div>

                      {/* Row 2: Metadata (Doc Type + Client Type) */}
                      <div className={KANBAN_CARD_METADATA_CLASS}>
                        <KanbanCardTag label={item.doc_type} />
                        <KanbanCardTag label={clientLabel} />
                      </div>

                      {/* Row 3: Footer — Request ID & Student No (bottom-left) + Course / Avatar (bottom-right) */}
                      <div className={KANBAN_CARD_FOOTER_CLASS}>
                        <div className="flex items-center gap-1.5 min-w-0 tabular-nums font-medium">
                          <Badge variant="gray" size="compact" className="rounded-lg">#{item.id}</Badge>
                          {item.student_no && (
                            <>
                              <span>·</span>
                              <span className="truncate">{item.student_no}</span>
                            </>
                          )}
                          {isLocked && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-gray-400 dark:text-zinc-500 inline-flex items-center">
                                  <LockIcon size={12} aria-hidden="true" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Terminal record (locked)</TooltipContent>
                            </Tooltip>
                          )}
                          {Number(item.attachment_count) > 0 && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 dark:text-zinc-500"
                              title={`${item.attachment_count} attachment(s)`}
                            >
                              <Attachment01Icon size={12} />
                              {item.attachment_count}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 max-w-[130px]">
                          <KanbanMiniAvatar
                            code={item.course_code}
                            name={requesterName}
                          />
                          <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400 truncate">
                            {item.course_code || clientLabel}
                          </span>
                        </div>
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
    </div>
  );
}

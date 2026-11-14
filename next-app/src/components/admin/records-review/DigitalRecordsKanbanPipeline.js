"use client";
import { BADGE_BASE } from "@/lib/badgeStyles";


import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { cn, formatTitleCase } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { formatBytes, formatUploadedDate } from "./DigitalRecordsList";
import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  File02Icon,
  Pdf01Icon,
  RotateLeft01Icon,
  Tick01Icon,
  ViewIcon,
} from "hugeicons-react";

export const DIGITAL_RECORDS_KANBAN_COLUMNS = [
  {
    key: "Pending",
    label: "Awaiting Review",
    subtitle: "Pending verification",
    accent: "bg-amber-500",
    borderTop: "border-t-amber-500",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    dropZone: "border-amber-500/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
  },
  {
    key: "Approved",
    label: "Approved",
    subtitle: "Locked & archival ready",
    accent: "bg-emerald-500",
    borderTop: "border-t-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    dropZone: "border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
  },
  {
    key: "Declined",
    label: "Declined",
    subtitle: "Needs rescan / rejected",
    accent: "bg-rose-500",
    borderTop: "border-t-rose-500",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
    dropZone: "border-rose-500/60 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",
  },
];

export default function DigitalRecordsKanbanPipeline({
  records = [],
  onPreview,
  onApprove,
  onDecline,
  onSetStatus,
  onDropItem,
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
    const map = {
      Pending: [],
      Approved: [],
      Declined: [],
    };

    records.forEach((record) => {
      const status = record.approval_status || "Pending";
      if (map[status]) {
        map[status].push(record);
      } else {
        map.Pending.push(record);
      }
    });

    return map;
  }, [records]);

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
  }, [handleMouseUpCanvas, handleMouseMoveCanvas]);

  // Card Drag-and-Drop handlers
  const handleDragStartCard = (e, item) => {
    isDraggingCardRef.current = true;
    setDraggingItem(item);
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEndCard = () => {
    isDraggingCardRef.current = false;
    setDraggingItem(null);
    setDragOverColumn(null);
  };

  const handleDragOverColumn = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== colKey) {
      setDragOverColumn(colKey);
    }
  };

  const handleDragLeaveColumn = (e, colKey) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverColumn === colKey) {
      setDragOverColumn(null);
    }
  };

  const handleDropOnColumn = (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    let droppedData = draggingItem;
    if (!droppedData) {
      try {
        const raw = e.dataTransfer.getData("application/json");
        if (raw) droppedData = JSON.parse(raw);
      } catch {}
    }

    if (!droppedData) return;
    if (droppedData.approval_status === targetStatus) return;

    if (onDropItem) {
      onDropItem(droppedData, targetStatus);
    } else {
      if (targetStatus === "Approved") {
        onApprove?.(droppedData.id);
      } else if (targetStatus === "Declined") {
        onDecline?.(droppedData.id);
      } else if (targetStatus === "Pending") {
        onSetStatus?.(
          droppedData.id,
          "Pending",
          "Moved back to review queue via Kanban"
        );
      }
    }
  };

  return (
    <div
      ref={boardScrollRef}
      onMouseDown={handleMouseDownCanvas}
      className={cn(
        "w-full overflow-x-auto pb-6 pt-4 px-4 sm:px-6 show-scrollbar select-none",
        isPanningActive ? "cursor-grabbing" : "cursor-grab"
      )}
    >
      <div className="flex items-start gap-4 min-w-max">
        {DIGITAL_RECORDS_KANBAN_COLUMNS.map((col) => {
          const colItems = columnData[col.key] || [];
          const isOver = dragOverColumn === col.key;
          const isDraggingCurrentCol = draggingItem?.approval_status === col.key;

          return (
            <div
              key={col.key}
              onDragOver={(e) => handleDragOverColumn(e, col.key)}
              onDragLeave={(e) => handleDragLeaveColumn(e, col.key)}
              onDrop={(e) => handleDropOnColumn(e, col.key)}
              className={cn(
                "w-80 shrink-0 flex flex-col rounded-2xl border border-border/80 dark:border-white/10 bg-gray-50/70 dark:bg-zinc-900/60 shadow-2xs transition-all duration-200 overflow-hidden",
                col.borderTop,
                "border-t-4",
                isOver && !isDraggingCurrentCol && "ring-2 ring-pup-maroon dark:ring-red-400 bg-gray-100/80 dark:bg-zinc-800/80"
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 dark:border-white/10 bg-white/60 dark:bg-zinc-900/80 backdrop-blur-xs">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                      {col.label}
                    </span>
                    <span
                      className={cn("rounded-full px-2 py-0.2 text-[10px] font-semibold tabular-nums", col.badge, BADGE_BASE)}
                    >
                      {colItems.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                    {col.subtitle}
                  </span>
                </div>
              </div>

              {/* Column Dropzone / Items list */}
              <div className="flex flex-col gap-2.5 p-3 min-h-[380px] max-h-[calc(100vh-280px)] overflow-y-auto show-scrollbar">
                {/* Drag-over indicator placeholder */}
                {isOver && !isDraggingCurrentCol && (
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-xl border-2 border-dashed p-4 text-xs font-semibold animate-pulse transition-all",
                      col.dropZone
                    )}
                  >
                    Drop to mark as {col.label}
                  </div>
                )}

                {colItems.length === 0 && !isOver && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-xs text-gray-400 dark:text-zinc-500">
                    <p className="font-medium">No records in this queue</p>
                    <p className="text-[11px] text-gray-400/80 dark:text-zinc-600 mt-0.5">
                      Drag records here to update
                    </p>
                  </div>
                )}

                {colItems.map((record) => {
                  const isPdf = /\.pdf$/i.test(record.original_filename || "");
                  const isPending = record.approval_status === "Pending";
                  const isDeclined = record.approval_status === "Declined";
                  const isApproved = record.approval_status === "Approved";
                  const { dateStr, timeStr } = formatUploadedDate(record.created_at);

                  return (
                    <div
                      key={record.id}
                      draggable
                      onDragStart={(e) => handleDragStartCard(e, record)}
                      onDragEnd={handleDragEndCard}
                      onClick={() => onPreview?.(record)}
                      className={cn(
                        "kanban-card group flex flex-col gap-2.5 rounded-xl border border-border/80 dark:border-white/10 bg-white dark:bg-zinc-800/90 p-3.5 shadow-2xs hover:shadow-md hover:border-pup-maroon dark:hover:border-red-400/70 transition-all cursor-grab active:cursor-grabbing relative select-none",
                        draggingItem?.id === record.id && "opacity-40 scale-98"
                      )}
                    >
                      {/* Top row: Doc Type pill & File type */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn("inline-flex items-center rounded-full bg-gray-100 dark:bg-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-gray-800 dark:text-zinc-200 truncate max-w-[190px]", BADGE_BASE)}
                          title={record.doc_type}
                        >
                          {record.doc_type}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-400 tabular-nums">
                          {isPdf ? (
                            <Pdf01Icon size="1em" className="text-pup-maroon dark:text-red-400" />
                          ) : (
                            <File02Icon size="1em" />
                          )}
                          {formatBytes(record.size_bytes)}
                        </span>
                      </div>

                      {/* Middle: Student Name and Student Number */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-gray-900 group-hover:text-pup-maroon dark:text-zinc-100 dark:group-hover:text-red-400 transition-colors truncate">
                          {formatTitleCase(record.student_name)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-sans tabular-nums text-[11px] font-medium text-gray-600 dark:text-zinc-300">
                            {record.student_no}
                          </span>
                        </div>
                      </div>

                      {/* Filename subline */}
                      <div
                        className="truncate text-[11px] text-gray-500 dark:text-zinc-400"
                        title={record.original_filename}
                      >
                        {record.original_filename}
                      </div>

                      {/* If declined: Show note banner */}
                      {isDeclined && record.review_note && (
                        <div className="rounded-lg border border-red-200/70 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20 p-2 text-[10px] text-red-700 dark:text-red-300">
                          <span className="font-semibold block mb-0.5">Decline Reason:</span>
                          <span className="italic block truncate">&ldquo;{record.review_note}&rdquo;</span>
                        </div>
                      )}

                      {/* Bottom row: Date & Action Triggers */}
                      <div
                        className="flex items-center justify-between pt-1 border-t border-border/50 dark:border-white/5 text-[10px] text-gray-400 dark:text-zinc-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="tabular-nums" title={`Uploaded ${dateStr} ${timeStr}`}>
                          {dateStr}
                        </span>

                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => onPreview?.(record)}
                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                              >
                                <ViewIcon size="1em" className="text-xs" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Preview</TooltipContent>
                          </Tooltip>

                          {isPending && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => onApprove?.(record.id)}
                                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                                  >
                                    <Tick01Icon size="1em" className="text-xs" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Approve</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => onDecline?.(record.id)}
                                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                                  >
                                    <Cancel01Icon size="1em" className="text-xs" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Decline</TooltipContent>
                              </Tooltip>
                            </>
                          )}

                          {!isPending && onSetStatus && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onSetStatus(
                                      record.id,
                                      "Pending",
                                      "Moved back to review queue from Kanban"
                                    )
                                  }
                                  aria-label="Move back to Pending Review"
                                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-gray-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400 transition-colors cursor-pointer active:scale-95"
                                >
                                  <RotateLeft01Icon size="1em" className="text-xs" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Move back to Pending Review</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

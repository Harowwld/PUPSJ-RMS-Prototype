"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { cn, formatTitleCase } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  KanbanStatusIcon,
  KanbanDotTag,
  getTagDotColor,
} from "@/components/shared/KanbanPrimitives";
import { formatBytes, formatUploadedDate } from "./DigitalRecordsList";
import {
  Cancel01Icon,
  File02Icon,
  InboxIcon,
  Pdf01Icon,
  RotateLeft01Icon,
  Tick01Icon,
  ViewIcon,
} from "hugeicons-react";
import { EmptyState } from "@/components/ui/empty";

export const DIGITAL_RECORDS_KANBAN_COLUMNS = [
  {
    key: "Pending",
    label: "Awaiting Review",
    dropZone:
      "border-amber-500/50 bg-amber-50/60 dark:bg-amber-950/25 text-amber-700 dark:text-amber-300",
  },
  {
    key: "Approved",
    label: "Approved",
    dropZone:
      "border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-300",
  },
  {
    key: "Declined",
    label: "Declined",
    dropZone:
      "border-rose-500/50 bg-rose-50/60 dark:bg-rose-950/25 text-rose-700 dark:text-rose-300",
  },
];

export default function DigitalRecordsKanbanPipeline({
  records = [],
  isOsas = false,
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
        "w-full flex-1 flex flex-col min-h-[calc(100vh-20rem)] overflow-x-auto pb-4 pt-3 px-4 sm:px-6 show-scrollbar select-none",
        isPanningActive ? "cursor-grabbing" : "cursor-grab"
      )}
    >
      <div className="flex items-stretch gap-3.5 min-w-max flex-1 h-full min-h-[500px]">
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
                "w-80 shrink-0 flex flex-col h-full rounded-2xl border border-gray-200/60 dark:border-white/[0.06] bg-gray-100/75 dark:bg-zinc-900/60 p-2.5 transition-all duration-200",
                isOver &&
                  !isDraggingCurrentCol &&
                  "ring-2 ring-gray-400/50 dark:ring-zinc-600 bg-gray-200/60 dark:bg-zinc-800/70"
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

              {/* Column Dropzone / Items list */}
              <div className="flex flex-col gap-2 h-[760px] overflow-y-auto px-0.5 pb-0.5 show-scrollbar">
                {/* Drag-over indicator placeholder */}
                {isOver && !isDraggingCurrentCol && (
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-xl border border-dashed p-3.5 text-xs font-medium transition-all shrink-0",
                      col.dropZone
                    )}
                  >
                    Drop to mark as {col.label}
                  </div>
                )}

                {colItems.length === 0 && !isOver && (
                  <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <EmptyState
                      variant="compact"
                      icon={InboxIcon}
                      title="No records in queue"
                      description="Drag records here to update"
                    />
                  </div>
                )}

                {colItems.map((record) => {
                  const isPdf = /\.pdf$/i.test(record.original_filename || "");
                  const status = record.approval_status || "Pending";
                  const isPending = status === "Pending";
                  const isDeclined = status === "Declined";
                  const organizationName = record.organization_name || record.student_name;
                  const { dateStr, timeStr } = formatUploadedDate(record.created_at);

                  return (
                    <div
                      key={record.id}
                      draggable
                      onDragStart={(e) => handleDragStartCard(e, record)}
                      onDragEnd={handleDragEndCard}
                      onClick={() => onPreview?.(record)}
                      onDoubleClick={() => onPreview?.(record)}
                      className={cn(
                        "kanban-card group flex flex-col gap-2.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-700 hover:-translate-y-[1px] active:scale-[0.99] transition-all duration-150 cursor-grab active:cursor-grabbing relative select-none",
                        draggingItem?.id === record.id && "opacity-40 scale-98"
                      )}
                    >
                      {/* Row 1: Status Icon + Student Name (left) & Date (right) */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <KanbanStatusIcon status={status} className="mt-[3px]" />
                          <span
                            className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100 leading-snug line-clamp-1"
                            title={isOsas ? organizationName : formatTitleCase(record.student_name)}
                          >
                            {isOsas ? organizationName : formatTitleCase(record.student_name)}
                          </span>
                        </div>

                        <span
                          className={cn(
                            "text-[11px] font-medium tabular-nums shrink-0",
                            isDeclined
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-gray-400 dark:text-zinc-500"
                          )}
                          title={`Uploaded ${dateStr} ${timeStr}`}
                        >
                          {dateStr}
                        </span>
                      </div>

                      {/* Optional subline: Decline reason or filename */}
                      {isDeclined && record.review_note ? (
                        <p
                          className="text-[11px] text-rose-600 dark:text-rose-400 line-clamp-1 pl-5.5"
                          title={record.review_note}
                        >
                          Reason: &ldquo;{record.review_note}&rdquo;
                        </p>
                      ) : record.original_filename ? (
                        <p
                          className="text-[11px] text-gray-400 dark:text-zinc-500 truncate pl-5.5"
                          title={record.original_filename}
                        >
                          {record.original_filename}
                        </p>
                      ) : null}

                      {/* Row 2: Dot-Pill Tag(s) */}
                      <div className="flex flex-wrap items-center gap-1.5 pl-5.5">
                        <KanbanDotTag
                          label={record.doc_type}
                          dotColor={getTagDotColor(record.doc_type)}
                        />
                        {record.course_code && (
                          <KanbanDotTag
                            label={record.course_code}
                            dotColor="bg-sky-500"
                          />
                        )}
                      </div>

                      {/* Row 3: File Size / Hover Actions */}
                      <div
                        className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-gray-400 dark:text-zinc-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isOsas && (
                          <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-gray-400 dark:text-zinc-500">
                            {isPdf ? (
                              <Pdf01Icon size={13} className="text-rose-500/80 dark:text-rose-400/80 shrink-0" />
                            ) : (
                              <File02Icon size={13} className="text-gray-400 dark:text-zinc-500 shrink-0" />
                            )}
                            <span>{record.student_no}</span>
                          </span>
                        )}

                        {/* Resting state: File size */}
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 dark:text-zinc-500 tabular-nums group-hover:hidden group-focus-within:hidden">
                          {formatBytes(record.size_bytes)}
                        </span>

                        {/* Hover state: Quick Actions */}
                        <div className="hidden group-hover:flex group-focus-within:flex items-center gap-1 -my-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => onPreview?.(record)}
                                onDoubleClick={() => onPreview?.(record)}
                                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
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
                                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
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
                                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
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
                                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/40 text-gray-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400 transition-colors cursor-pointer active:scale-95"
                                >
                                  <RotateLeft01Icon size="1em" className="text-xs" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Move back to Pending Review
                              </TooltipContent>
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
